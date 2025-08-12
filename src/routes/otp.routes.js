const express = require("express");
const { sendOtp, verifyOtp, resendOtp, otpForForgotPassword, resendForgotPasswordOtp } = require("../controller/otp.controller");
const router = express.Router();

router.post("/verify", verifyOtp);
router.post("/resend", resendForgotPasswordOtp);

module.exports = router;
