const { Router } = require("express")
const { loginUser, logOutUser, getCurrentUser } = require("./controllers/auth.controller")
const { verifyOtp, resendForgotPasswordOtp } = require("./controllers/otp.controller")
const { changePassword, ForgotPassword, ResetPassword } = require("./controllers/password.controller")
const { emailVerifyToken } = require("./controllers/emailVerifyToken.controller")
const { getActiveSessions, terminateSession, checkSession } = require("./controllers/session.controller")
const sessionAuthMiddleware = require("../../middleware/sessionAuth")

const router = Router()

// Auth routes (no session required)
router.post("/users/login", loginUser)
router.post("/verify", verifyOtp)
router.post("/resend", resendForgotPasswordOtp)
router.post("/forgot-password", ForgotPassword)
router.post("/reset-password", ResetPassword)
router.get("/v2/verifyEmail/:token", emailVerifyToken)

// Session-protected routes
router.post("/users/logout", sessionAuthMiddleware, logOutUser)
router.get("/auth/me", sessionAuthMiddleware, getCurrentUser)
router.post("/change-password", sessionAuthMiddleware, changePassword)

// Session management routes
router.get("/sessions", sessionAuthMiddleware, getActiveSessions)
router.delete("/sessions/:sessionId", sessionAuthMiddleware, terminateSession)
router.get("/session/check", sessionAuthMiddleware, checkSession)

module.exports = router
