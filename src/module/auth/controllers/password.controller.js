const User = require("../../user/models/User");
const Otp = require("../models/Otp");
const bcrypt = require("bcrypt");
const { otpForForgotPassword } = require("./otp.controller");
const jwt = require("jsonwebtoken");

const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json("User not found");
    }

    if (user.isLoggedIn === false) {
      return res.status(401).json("User is not logged in");
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json("Old password is incorrect");
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    return res.status(200).json("Password changed successfully");
  } catch (error) {
    console.error("Error Changing Password:", error);
    return res.status(500).json("Internal Server Error");
  }
};

const ForgotPassword = async (req, res) => {
  const email = req.body.email;

  try {
    const result = await otpForForgotPassword(email);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error Sending OTP:", error);
    if (error.message === "User not found") {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === "Email is required") {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const ResetPassword = async (req, res) => {
  const { resetToken, newPassword } = req.body;

  try {
    // Verify reset token
    const decoded = jwt.verify(resetToken, process.env.RESET_PASSWORD_SECRET);
    const email = decoded.email;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json("User not found");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    return res.status(200).json("Password reset successfully");
  } catch (error) {
    console.error("ResetPassword error:", error);
    return res.status(400).json("Invalid or expired reset token");
  }
};

module.exports = {
  changePassword,
  ForgotPassword,
  ResetPassword,
};
