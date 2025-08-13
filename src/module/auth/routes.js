const { Router } = require("express")
const { loginUser, logOutUser, getCurrentUser } = require("./controllers/auth.controller")
const { verifyOtp, resendForgotPasswordOtp } = require("./controllers/otp.controller")
const { changePassword, ForgotPassword, ResetPassword } = require("./controllers/password.controller")
const { emailVerifyToken } = require("./controllers/emailVerifyToken.controller")
const authMiddleware = require("../../middleware/auth")

const router = Router()

// Auth routes
router.post("/users/login", loginUser)
router.post("/users/logout", authMiddleware, logOutUser)
router.get("/auth/me", authMiddleware, getCurrentUser)

// OTP routes
router.post("/verify", verifyOtp)
router.post("/resend", resendForgotPasswordOtp)

// Password routes
router.post("/change-password", authMiddleware, changePassword)
router.post("/forgot-password", ForgotPassword)
router.post("/reset-password", ResetPassword)

// Email verification routes
router.get("/v2/verifyEmail/:token", emailVerifyToken)

module.exports = router
