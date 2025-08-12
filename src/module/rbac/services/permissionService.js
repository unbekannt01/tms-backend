const Role = require("../models/Role")

class PermissionService {
  static async hasPermission(user, permission) {
    try {
      if (!user.roleId) {
        return false
      }

      const role = await Role.findById(user.roleId)
      if (!role || !role.isActive) {
        return false
      }

      return role.permissions.includes(permission)
    } catch (error) {
      console.error("Permission check error:", error)
      return false
    }
  }

  static async hasAnyPermission(user, permissions) {
    try {
      if (!user.roleId) {
        return false
      }

      const role = await Role.findById(user.roleId)
      if (!role || !role.isActive) {
        return false
      }

      return permissions.some((permission) => role.permissions.includes(permission))
    } catch (error) {
      console.error("Permission check error:", error)
      return false
    }
  }

  static async getUserPermissions(user) {
    try {
      if (!user.roleId) {
        return []
      }

      const role = await Role.findById(user.roleId)
      if (!role || !role.isActive) {
        return []
      }

      return role.permissions
    } catch (error) {
      console.error("Get user permissions error:", error)
      return []
    }
  }
}

module.exports = PermissionService
