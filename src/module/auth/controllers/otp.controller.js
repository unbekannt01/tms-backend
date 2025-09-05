const Otp = require("../models/Otp");
const User = require("../../user/models/User");
const {
  EmailServiceForForgotPasswordOTP,
} = require("../services/emailForgotPasswordOtpService");
const {
  generateOtp,
  expiresOtp,
  getOtpExpiryMinutes,
} = require("../../../utils/otpUtils");
const jwt = require("jsonwebtoken");

const emailServiceForForgotPassword = new EmailServiceForForgotPasswordOTP();

const otpForForgotPassword = async (email) => {
  if (!email) {
    throw new Error("Email is required");
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error("Invalid email format");
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new Error("User not found");
  }

  // Delete any existing OTPs for this email
  await Otp.deleteMany({ email: email.toLowerCase() });

  const otpCode = generateOtp();
  const otpExpiration = expiresOtp();

  try {
    const emailSent =
      await emailServiceForForgotPassword.sendForgotPasswordOtpEmail(
        email,
        otpCode,
        user.firstName || "User"
      );

    if (!emailSent) {
      throw new Error("Failed to send OTP email. Please try again later.");
    }

    const otpData = new Otp({
      otp: otpCode,
      otpExpiration,
      userId: user._id,
      email: email.toLowerCase(),
    });

    await otpData.save();

    return {
      message: "OTP sent successfully",
      expiresAt: otpExpiration,
      expiresInMinutes: getOtpExpiryMinutes(),
    };
  } catch (error) {
    console.error("Error in otpForForgotPassword:", error);
    throw new Error("Failed to process password reset request");
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        message: "Email and OTP are required",
      });
    }

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        message: "OTP must be 6 digits",
      });
    }

    const existingOtp = await Otp.findOne({
      email: email.toLowerCase(),
      otp: otp.trim(),
    }).sort({
      otpExpiration: -1,
    });

    if (!existingOtp) {
      return res.status(400).json({
        message: "Invalid OTP. Please check and try again.",
      });
    }

    // Check if OTP has expired
    if (new Date() > existingOtp.otpExpiration) {
      await Otp.findByIdAndDelete(existingOtp._id);
      return res.status(400).json({
        message: "OTP has expired. Please request a new one.",
      });
    }

    // Verify user still exists
    const user = await User.findById(existingOtp.userId);
    if (!user) {
      await Otp.findByIdAndDelete(existingOtp._id);
      return res.status(404).json({
        message: "User account not found",
      });
    }

    // Create reset token (expires in 10 minutes)
    const resetToken = jwt.sign(
      {
        email: email.toLowerCase(),
        userId: existingOtp.userId,
        purpose: "password_reset",
      },
      process.env.RESET_PASSWORD_SECRET,
      { expiresIn: "10m" }
    );

    // Delete OTP to prevent reuse
    await Otp.findByIdAndDelete(existingOtp._id);

    return res.json({
      message: "OTP verified successfully",
      resetToken,
      resetTokenExpiresIn: "10 minutes",
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({
      message: "Failed to verify OTP. Please try again.",
    });
  }
};

const resendForgotPasswordOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: "Invalid email format",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        message: "User not found with this email",
      });
    }

    // ✅ Enhanced cooldown check with exact time remaining
    const cooldownTime = 60 * 1000; // 60 seconds in milliseconds
    const recentOtp = await Otp.findOne({
      email: email.toLowerCase(),
      createdAt: { $gte: new Date(Date.now() - cooldownTime) },
    }).sort({ createdAt: -1 });

    if (recentOtp) {
      // Calculate exact time remaining
      const timeSinceCreated =
        Date.now() - new Date(recentOtp.createdAt).getTime();
      const timeRemaining = Math.ceil((cooldownTime - timeSinceCreated) / 1000);

      return res.status(429).json({
        message: `Please wait ${timeRemaining} seconds before requesting a new OTP`,
        waitTime: timeRemaining,
        canResendAt: new Date(
          new Date(recentOtp.createdAt).getTime() + cooldownTime
        ),
      });
    }

    // Delete existing OTPs for this email
    await Otp.deleteMany({ email: email.toLowerCase() });

    const otpCode = generateOtp();
    const otpExpiration = expiresOtp();

    const emailSent =
      await emailServiceForForgotPassword.sendForgotPasswordOtpEmail(
        email,
        otpCode,
        user.firstName || "User"
      );

    if (!emailSent) {
      return res.status(502).json({
        message: "Failed to send OTP email. Please try again later.",
      });
    }

    const otpData = new Otp({
      otp: otpCode,
      otpExpiration,
      userId: user._id,
      email: email.toLowerCase(),
    });

    await otpData.save();

    return res.json({
      message: "New OTP sent successfully",
      expiresAt: otpExpiration,
      expiresInMinutes: getOtpExpiryMinutes(),
      nextResendAllowedAt: new Date(Date.now() + cooldownTime),
    });
  } catch (error) {
    console.error("Error resending OTP:", error);
    res.status(500).json({
      message: "Failed to resend OTP. Please try again.",
    });
  }
};

module.exports = {
  otpForForgotPassword,
  verifyOtp,
  resendForgotPasswordOtp,
};
