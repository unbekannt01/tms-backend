const { Router } = require("express")
const {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  addComment,
  getTaskStats,
} = require("./controllers/task.controller")
const sessionAuthMiddleware = require("../../middleware/sessionAuth")
const { requirePermission } = require("../rbac/middleware/permission.middlewar")

const router = Router()

// Task routes
router.post("/tasks", sessionAuthMiddleware, requirePermission("task:create:own"), createTask)
router.get("/tasks", sessionAuthMiddleware, requirePermission("task:read:own"), getTasks)
router.get("/tasks/stats", sessionAuthMiddleware, requirePermission("task:read:own"), getTaskStats)
router.get("/tasks/:id", sessionAuthMiddleware, requirePermission("task:read:own"), getTaskById)
router.put("/tasks/:id", sessionAuthMiddleware, requirePermission("task:update:own"), updateTask)
router.delete("/tasks/:id", sessionAuthMiddleware, requirePermission("task:delete:own"), deleteTask)
router.post("/tasks/:id/comments", sessionAuthMiddleware, requirePermission("task:read:own"), addComment)

module.exports = router
