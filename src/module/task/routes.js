const { Router } = require("express");
const {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  addComment,
  getTaskStats,
  enhanceTaskDescription,
} = require("./controllers/task.controller");
const sessionAuthMiddleware = require("../../middleware/sessionAuth");
const {
  requirePermission,
  requireAnyPermission,
} = require("../rbac/middleware/permission.middlewar");

const router = Router();

// Task routes
router.post(
  "/tasks",
  sessionAuthMiddleware,
  requirePermission("task:create:own"),
  createTask
);
router.get(
  "/tasks",
  sessionAuthMiddleware,
  requirePermission("task:read:own"),
  getTasks
);
router.get(
  "/tasks/stats",
  sessionAuthMiddleware,
  requirePermission("task:read:own"),
  getTaskStats
);
router.get(
  "/tasks/:id",
  sessionAuthMiddleware,
  requirePermission("task:read:own"),
  getTaskById
);
router.put(
  "/tasks/:id",
  sessionAuthMiddleware,
  requirePermission("task:update:own"),
  updateTask
);
router.delete(
  "/tasks/:id",
  sessionAuthMiddleware,
  requirePermission("task:delete:own"),
  deleteTask
);
router.post(
  "/tasks/:id/comments",
  sessionAuthMiddleware,
  requirePermission("task:read:own"),
  addComment
);

// AI enhancement endpoint
// Allows users who can create, update, or read their own tasks to use enhancement.
// This is useful before creating a task or while editing.
router.post(
  "/tasks/enhance-description",
  sessionAuthMiddleware,
  requireAnyPermission(["task:create:own", "task:update:own", "task:read:own"]),
  enhanceTaskDescription
);

module.exports = router;
