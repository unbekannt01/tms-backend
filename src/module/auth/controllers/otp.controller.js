const Otp = require("../models/Otp");
const User = require("../../user/models/User");
const {
  EmailServiceForForgotPasswordOTP,
} = require("../services/emailForgotPasswordOtpService");
const { generateOtp, expiresOtp } = require("../../../utils/otpUtils");
const jwt = require("jsonwebtoken");

const emailServiceForForgotPassword = new EmailServiceForForgotPasswordOTP();

const otpForForgotPassword = async (email) => {
  if (!email) throw new Error("Email is required");

  const user = await User.findOne({ email });
  if (!user) throw new Error("User not found");

  const otpCode = generateOtp();
  const otpExpiration = expiresOtp();

  const otpData = new Otp({
    otp: otpCode,
    otpExpiration,
    userId: user._id,
    email,
  });

  await otpData.save();

  await emailServiceForForgotPassword.sendForgotPasswordOtpEmail(
    email,
    otpCode,
    user.firstName || "User"
  );

  return { message: "OTP generated successfully", expiresAt: otpExpiration };
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const existingOtp = await Otp.findOne({ email, otp }).sort({
      otpExpiration: -1,
    });

    if (!existingOtp) {
      return res.status(400).json({ message: "Invalid OTP or no OTP found" });
    }

    if (new Date() > existingOtp.otpExpiration) {
      await Otp.findByIdAndDelete(existingOtp._id);
      return res.status(400).json({ message: "OTP has expired" });
    }

    // OTP is valid → create reset token (expires in 10 mins)
    const resetToken = jwt.sign({ email }, process.env.RESET_PASSWORD_SECRET, {
      expiresIn: "10m",
    });

    // Delete OTP so it can’t be reused
    await Otp.findByIdAndDelete(existingOtp._id);

    return res.json({
      message: "OTP verified successfully",
      resetToken,
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ message: "Failed to verify OTP" });
  }
};

const resendForgotPasswordOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await Otp.deleteMany({ email });

    const otpCode = generateOtp();
    const otpExpiration = expiresOtp();

    const otpData = new Otp({
      otp: otpCode,
      otpExpiration,
      userId: user._id,
      email,
    });

    await otpData.save();

    await emailServiceForForgotPassword.sendForgotPasswordOtpEmail(
      email,
      otpCode,
      user.firstName || "User"
    );

    return res.json({
      message: "New OTP sent successfully",
      expiresAt: otpExpiration,
    });
  } catch (error) {
    console.error("Error resending OTP:", error);
    res.status(500).json({ message: "Failed to resend OTP" });
  }
};

module.exports = {
  otpForForgotPassword,
  verifyOtp,
  resendForgotPasswordOtp,
};
