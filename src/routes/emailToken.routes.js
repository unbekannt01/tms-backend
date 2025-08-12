const express = require("express");
const { emailVerifyToken } = require("../controller/emailVerifyToken.controller");
const router = express.Router();

router.get("/v2/verifyEmail/:token", emailVerifyToken);

module.exports = router;