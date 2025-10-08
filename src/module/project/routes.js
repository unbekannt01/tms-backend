// src/module/project/routes.js
const { Router } = require("express");
const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  archiveProject,
  addTeamMember,
  removeTeamMember,
  getProjectStats,
} = require("./controllers/project.controller");
const sessionAuthMiddleware = require("../../middleware/sessionAuth");
const {
  requirePermission,
  requireAnyPermission,
} = require("../rbac/middleware/permission.middlewar");

const router = Router();

// Project CRUD routes
router.post(
  "/projects",
  sessionAuthMiddleware,
  requirePermission("project:create"),
  createProject
);

router.get(
  "/projects",
  sessionAuthMiddleware,
  requireAnyPermission(["project:read:own", "project:read:team", "project:read:all"]),
  getProjects
);

router.get(
  "/projects/stats",
  sessionAuthMiddleware,
  requireAnyPermission(["project:read:own", "project:read:team", "project:read:all"]),
  getProjectStats
);

router.get(
  "/projects/:id",
  sessionAuthMiddleware,
  requireAnyPermission(["project:read:own", "project:read:team", "project:read:all"]),
  getProjectById
);

router.put(
  "/projects/:id",
  sessionAuthMiddleware,
  requireAnyPermission(["project:update:own", "project:update:team", "project:update:all"]),
  updateProject
);

router.delete(
  "/projects/:id",
  sessionAuthMiddleware,
  requireAnyPermission(["project:delete:own", "project:delete:team", "project:delete:all"]),
  deleteProject
);

// Additional project operations
router.patch(
  "/projects/:id/archive",
  sessionAuthMiddleware,
  requireAnyPermission(["project:update:own", "project:update:team", "project:update:all"]),
  archiveProject
);

router.post(
  "/projects/:id/team",
  sessionAuthMiddleware,
  requireAnyPermission(["project:update:team", "project:update:all"]),
  addTeamMember
);

router.delete(
  "/projects/:id/team/:userId",
  sessionAuthMiddleware,
  requireAnyPermission(["project:update:team", "project:update:all"]),
  removeTeamMember
);

module.exports = router;
