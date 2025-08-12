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
const authMiddleware = require("../../middleware/auth")
const { requirePermission } = require("../rbac/middleware/permission.middlewar")

const router = Router()

// Task routes
router.post("/tasks", authMiddleware, requirePermission("task:create:own"), createTask)
router.get("/tasks", authMiddleware, requirePermission("task:read:own"), getTasks)
router.get("/tasks/stats", authMiddleware, requirePermission("task:read:own"), getTaskStats)
router.get("/tasks/:id", authMiddleware, requirePermission("task:read:own"), getTaskById)
router.put("/tasks/:id", authMiddleware, requirePermission("task:update:own"), updateTask)
router.delete("/tasks/:id", authMiddleware, requirePermission("task:delete:own"), deleteTask)
router.post("/tasks/:id/comments", authMiddleware, requirePermission("task:read:own"), addComment)

module.exports = router
