// routes.js
const { Router } = require("express")
const { getManagerAnalytics, getTeamMemberDetails, getAdminAnalytics } = require("./controllers/analytics.controller")
const sessionAuthMiddleware = require("../../middleware/sessionAuth")
const { requirePermission } = require("../../module/rbac/middleware/permission.middlewar")

const router = Router()

// Manager analytics routes
router.get(
  "/manager/analytics",
  sessionAuthMiddleware,
  requirePermission("task:read:team"), // Only managers can access
  getManagerAnalytics,
)

router.get(
  "/manager/team-member/:memberId",
  sessionAuthMiddleware,
  requirePermission("task:read:team"),
  getTeamMemberDetails,
)

// Admin analytics route
router.get("/admin/analytics", sessionAuthMiddleware, requirePermission("task:read:all"), getAdminAnalytics)

module.exports = router