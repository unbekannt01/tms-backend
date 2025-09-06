const { Router } = require("express");
const {
  loginUser,
  logOutUser,
  getCurrentUser,
  setSecurityQuestions,
  verifySecurityAnswers,
  getSecurityQuestions,
} = require("./controllers/auth.controller");
const {
  verifyOtp,
  resendForgotPasswordOtp,
} = require("./controllers/otp.controller");
const {
  changePassword,
  ForgotPassword,
  ResetPassword,
  resetPasswordWithBackupCode,
  resetPasswordWithSecurityQuestions,
} = require("./controllers/password.controller");
const {
  emailVerifyToken,
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
const {
  resendEmailVerification,
} = require("./controllers/resendEmailVerification.controller");

const router = Router();

router.post("/users/login", authLimiter, loginUser);
router.post("/verify", authLimiter, verifyOtp);
router.post("/resend", authLimiter, resendForgotPasswordOtp);
router.post("/resend-email-verification", authLimiter, resendEmailVerification);
router.post("/forgot-password", sensitiveOperationsLimiter, ForgotPassword);
router.post("/reset-password", sensitiveOperationsLimiter, ResetPassword);
router.post(
  "/reset-password-with-backupCode",
  sensitiveOperationsLimiter,
  resetPasswordWithBackupCode
);
router.get("/v2/verifyEmail/:token", emailVerifyToken);

router.post(
  "/setSecurityQuestions",
  sensitiveOperationsLimiter,
  setSecurityQuestions
);
router.post(
  "/verifySecurityAnswers",
  sensitiveOperationsLimiter,
  verifySecurityAnswers
);
router.get(
  "/getSecurityQuestions",
  getSecurityQuestions
);

router.post("/reset-password-with-backup-code", resetPasswordWithBackupCode)
router.post("/reset-password-with-security-answers", resetPasswordWithSecurityQuestions);


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
