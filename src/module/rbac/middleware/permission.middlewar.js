const PermissionService = require("../services/permissionService")

const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      const user = req.user
      if (!user) {
        return res.status(401).json({ message: "Authentication required" })
      }

      const hasPermission = await PermissionService.hasPermission(user, permission)
      if (!hasPermission) {
        return res.status(403).json({
          message: "Insufficient permissions",
          required: permission,
        })
      }

      next()
    } catch (error) {
      console.error("Permission middleware error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  }
}

const requireAnyPermission = (permissions) => {
  return async (req, res, next) => {
    try {
      const user = req.user
      if (!user) {
        return res.status(401).json({ message: "Authentication required" })
      }

      const hasPermission = await PermissionService.hasAnyPermission(user, permissions)
      if (!hasPermission) {
        return res.status(403).json({
          message: "Insufficient permissions",
          required: permissions,
        })
      }

      next()
    } catch (error) {
      console.error("Permission middleware error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  }
}

const requireRole = (roleName) => {
  return async (req, res, next) => {
    try {
      const user = req.user
      if (!user || !user.roleId) {
        return res.status(401).json({ message: "Authentication required" })
      }

      const Role = require("../models/Role")
      const role = await Role.findById(user.roleId)

      if (!role || role.name !== roleName) {
        return res.status(403).json({
          message: "Insufficient role permissions",
          required: roleName,
        })
      }

      next()
    } catch (error) {
      console.error("Role middleware error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  }
}

module.exports = {
  requirePermission,
  requireAnyPermission,
  requireRole,
}
  