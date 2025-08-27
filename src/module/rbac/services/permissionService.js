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

  static async hasHierarchicalPermission(user, targetUserId, permission) {
    try {
      if (!user.roleId) {
        return false
      }

      const userRole = await Role.findById(user.roleId)
      if (!userRole || !userRole.isActive) {
        return false
      }

      // Check if user has the base permission
      if (!userRole.permissions.includes(permission)) {
        return false
      }

      // If targeting themselves, always allow
      if (user._id.toString() === targetUserId.toString()) {
        return true
      }

      // Get target user's role for hierarchy check
      const User = require("../../user/models/User")
      const targetUser = await User.findById(targetUserId).populate("roleId")

      if (!targetUser || !targetUser.roleId) {
        return true // Can act on users without roles
      }

      // Check hierarchy - can only act on users with lower or equal hierarchy level
      return userRole.hierarchyLevel >= targetUser.roleId.hierarchyLevel
    } catch (error) {
      console.error("Hierarchical permission check error:", error)
      return false
    }
  }

  static async canManageRole(user, targetRoleName) {
    try {
      if (!user.roleId) {
        return false
      }

      const userRole = await Role.findById(user.roleId)
      if (!userRole || !userRole.isActive) {
        return false
      }

      // Must have role management permission
      if (!userRole.permissions.includes("role:assign") && !userRole.permissions.includes("role:manage")) {
        return false
      }

      const targetRole = await Role.findOne({ name: targetRoleName })
      if (!targetRole) {
        return false
      }

      // Can only assign roles with lower hierarchy level
      return userRole.hierarchyLevel > targetRole.hierarchyLevel
    } catch (error) {
      console.error("Role management check error:", error)
      return false
    }
  }

  static async hasTeamPermission(user, targetUserId, permission) {
    try {
      if (!user.roleId) {
        return false
      }

      const role = await Role.findById(user.roleId)
      if (!role || !role.isActive) {
        return false
      }

      // Check if user has the permission
      if (!role.permissions.includes(permission)) {
        return false
      }

      // If targeting themselves, always allow
      if (user._id.toString() === targetUserId.toString()) {
        return true
      }

      // Check if both users are in the same team
      const User = require("../../user/models/User")
      const targetUser = await User.findById(targetUserId)

      if (!targetUser) {
        return false
      }

      // If user has team-level permission and both are in same team
      if (user.teamId && targetUser.teamId && user.teamId.toString() === targetUser.teamId.toString()) {
        return true
      }

      return false
    } catch (error) {
      console.error("Team permission check error:", error)
      return false
    }
  }

  static async resolvePermission(user, permission, targetUserId = null, context = {}) {
    try {
      // Basic permission check
      const hasBasicPermission = await this.hasPermission(user, permission)
      if (!hasBasicPermission) {
        return false
      }

      // If no target user, just return basic permission
      if (!targetUserId) {
        return true
      }

      // Check scope-based permissions
      if (permission.includes(":own")) {
        return user._id.toString() === targetUserId.toString()
      }

      if (permission.includes(":team")) {
        return await this.hasTeamPermission(user, targetUserId, permission)
      }

      if (permission.includes(":all")) {
        return await this.hasHierarchicalPermission(user, targetUserId, permission)
      }

      // Default to basic permission for non-scoped permissions
      return true
    } catch (error) {
      console.error("Permission resolution error:", error)
      return false
    }
  }
}

module.exports = PermissionService
