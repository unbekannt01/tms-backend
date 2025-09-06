const User = require("../../user/models/User");
const Otp = require("../models/Otp");
const bcrypt = require("bcrypt");
const { otpForForgotPassword } = require("./otp.controller");
const jwt = require("jsonwebtoken");
const {
  invalidateAllUserSessions,
  invalidateOtherUserSessions,
} = require("../../../utils/sessionUtils");
const {
  verifyBackupCodeByEmail,
} = require("../../user/services/backupCodeService");
const {
  verifySecurityAnswers,
} = require("../../auth/controllers/auth.controller");

const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  try {
    // Validate input
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        message: "Both old and new passwords are required",
      });
    }

    // Password strength validation
    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "New password must be at least 6 characters long",
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        message: "Current password is incorrect",
      });
    }

    // Check if new password is same as old password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        message: "New password must be different from current password",
      });
    }

    const salt = await bcrypt.genSalt(12); // Use higher salt rounds for security
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    // Invalidate all other sessions except current one
    await invalidateOtherUserSessions(req.userId, req.sessionId);

    return res.status(200).json({
      message: "Password changed successfully",
    });
  } catch (error) {
    // console.error("Error changing password:", error);
    return res.status(500).json({
      message: "Failed to change password. Please try again.",
    });
  }
};

const ForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const result = await otpForForgotPassword(email.toLowerCase());
    return res.status(200).json(result);
  } catch (error) {
    // console.error("Forgot password error:", error);

    if (error.message === "User not found") {
      return res.status(404).json({ message: error.message });
    }
    if (
      error.message === "Email is required" ||
      error.message === "Invalid email format"
    ) {
      return res.status(400).json({ message: error.message });
    }
    if (error.message.includes("Failed to send OTP email")) {
      return res.status(502).json({
        message: "Email service temporarily unavailable. Please try again.",
      });
    }

    return res.status(500).json({
      message: "Failed to process password reset request",
    });
  }
};

const ResetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({
        message: "Reset token and new password are required",
      });
    }

    // Password strength validation
    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long",
      });
    }

    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.RESET_PASSWORD_SECRET);
    } catch (jwtError) {
      // console.error("JWT verification failed:", jwtError.message);
      return res.status(400).json({
        message: "Invalid or expired reset token",
      });
    }

    // Validate token purpose and structure
    if (
      decoded.purpose !== "password_reset" ||
      !decoded.email ||
      !decoded.userId
    ) {
      return res.status(400).json({
        message: "Invalid reset token",
      });
    }

    const user = await User.findOne({
      _id: decoded.userId,
      email: decoded.email,
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found or email mismatch",
      });
    }

    // Check if new password is same as current password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        message: "New password must be different from your current password",
      });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    // Clean up any remaining OTPs for this user
    await Otp.deleteMany({
      $or: [{ userId: user._id }, { email: user.email }],
    });

    // Invalidate ALL existing sessions for this user
    await invalidateAllUserSessions(user._id);

    // console.log(`✅ Password reset successful for user: ${user.email}`);

    return res.status(200).json({
      message:
        "Password reset successfully. Please login with your new password.",
    });
  } catch (error) {
    // console.error("Reset password error:", error);
    return res.status(500).json({
      message: "Failed to reset password. Please try again.",
    });
  }
};

const resetPasswordWithBackupCode = async (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword)
    return res
      .status(400)
      .json({ message: "Email, backup code and new password are required" });

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return res.status(404).json({ message: "User not found" });

  const isValidCode = await verifyBackupCodeByEmail(email, code);
  if (!isValidCode)
    return res
      .status(400)
      .json({ message: "Invalid or already used backup code" });

  const salt = await bcrypt.genSalt(12);
  user.password = await bcrypt.hash(newPassword, salt);
  await user.save();

  await invalidateAllUserSessions(user._id);

  return res.status(200).json({
    message:
      "Password reset successfully using backup code. Please login with your new password.",
  });
};

const resetPasswordWithSecurityQuestions = async (req, res) => {
  try {
    const { email, answers, securityAnswers, newPassword } = req.body;

    // accept either "securityAnswers" or "answers"
    const providedAnswers = securityAnswers || answers;

    if (
      !email ||
      !Array.isArray(providedAnswers) ||
      providedAnswers.length === 0 ||
      !newPassword
    ) {
      return res.status(400).json({
        message: "Email, security answers, and new password are required",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const verified = await verifySecurityAnswers(email, providedAnswers);
    if (!verified) {
      return res
        .status(400)
        .json({ message: "Security answers are incorrect" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    await invalidateAllUserSessions(user._id);

    return res.status(200).json({
      message: "Password reset successfully using security questions",
    });
  } catch (error) {
    console.error("Error in resetPasswordWithSecurityQuestions:", error);
    return res.status(500).json({
      message: "Failed to reset password",
      error: error.message,
    });
  }
};

module.exports = {
  changePassword,
  ForgotPassword,
  ResetPassword,
  resetPasswordWithBackupCode,
  resetPasswordWithSecurityQuestions,
};
