const { Router } = require("express");
const { changePassword, ForgotPassword, ResetPassword } = require("../controller/password.controller"); // note plural if needed
const authMiddleware = require("../middleware/auth");
const router = Router();

router.post("/change-password", authMiddleware, changePassword);
router.post("/forgot-password", ForgotPassword),
router.post("/reset-password", ResetPassword);

module.exports = router;
