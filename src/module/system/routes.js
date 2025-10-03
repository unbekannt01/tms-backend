const express = require("express");
const router = express.Router();

const sessionAuthMiddleware = require("../../middleware/sessionAuth");
const adminAuthMiddleware = require("../../middleware/adminAuthMiddleware");
const {
  getMaintenanceStatus,
  setMaintenanceStatus,
} = require("./controllers/system.controller");

// Public: read maintenance status
router.get("/system/maintenance", getMaintenanceStatus);

// Admin-only: toggle maintenance
router.post(
  "/admin/system/maintenance",
  sessionAuthMiddleware,
  adminAuthMiddleware,
  setMaintenanceStatus
);

module.exports = router;
