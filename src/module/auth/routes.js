const { Router } = require("express");
const {
  loginUser,
  logOutUser,
  getCurrentUser,
} = require("./controllers/auth.controller");
const {
  verifyOtp,
  resendForgotPasswordOtp,
} = require("./controllers/otp.controller");
const {
  changePassword,
  ForgotPassword,
  ResetPassword,
} = require("./controllers/password.controller");
const {
  emailVerifyToken,
  resendEmailVerification,
} = require("./controllers/emailVerifyToken.controller");
const {
  getActiveSessions,
  terminateSession,
  checkSession,
  getAllActiveSessionsController,
} = require("./controllers/session.controller");
const sessionAuthMiddleware = require("../../middleware/sessionAuth");
const {
  authLimiter,
  sensitiveOperationsLimiter,
} = require("../../middleware/rateLimiter");

const router = Router();

router.post("/users/login", authLimiter, loginUser);
router.post("/verify", authLimiter, verifyOtp);
router.post("/resend", authLimiter, resendForgotPasswordOtp);
router.post("/resend-email-verification", authLimiter, resendEmailVerification);
router.post("/forgot-password", sensitiveOperationsLimiter, ForgotPassword);
router.post("/reset-password", sensitiveOperationsLimiter, ResetPassword);
router.get("/v2/verifyEmail/:token", emailVerifyToken);

// Session-protected routes
router.post("/users/logout", sessionAuthMiddleware, logOutUser);
router.get("/auth/me", sessionAuthMiddleware, getCurrentUser);
router.post(
  "/change-password",
  sessionAuthMiddleware,
  sensitiveOperationsLimiter,
  changePassword
);

// Session management routes
router.get("/sessions", sessionAuthMiddleware, getActiveSessions);
router.delete("/sessions/:sessionId", sessionAuthMiddleware, terminateSession);
router.get("/session/check", sessionAuthMiddleware, checkSession);
router.get(
  "/allSession",
  sessionAuthMiddleware,
  getAllActiveSessionsController
);

module.exports = router;
