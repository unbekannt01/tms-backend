const Project = require("../module/project/models/Project");
const PermissionService = require("../module/rbac/services/permissionService");

/**
 * Get projects accessible to the current user based on their permissions
 * @param {Object} user - Current user object
 * @param {Object} filters - Additional filters to apply
 * @returns {Array} Array of accessible project IDs
 */
const getAccessibleProjects = async (user, filters = {}) => {
  try {
    const canViewAll = await PermissionService.hasPermission(
      user,
      "project:read:all"
    );
    const canViewTeam = await PermissionService.hasPermission(
      user,
      "project:read:team"
    );

    let query = { ...filters };

    if (canViewAll) {
      // Admin can see all projects
    } else if (canViewTeam) {
      // Manager can see projects they created, are assigned to, or are team members of
      query.$or = [
        { createdBy: user._id },
        { assignedManager: user._id },
        { "teamMembers.user": user._id },
      ];
    } else {
      // Regular user can only see projects they are team members of
      query.$or = [{ createdBy: user._id }, { "teamMembers.user": user._id }];
    }

    const projects = await Project.find(query).select("_id name");
    return projects;
  } catch (error) {
    console.error("Get accessible projects error:", error);
    return [];
  }
};

/**
 * Check if user has access to a specific project
 * @param {Object} user - Current user object
 * @param {String} projectId - Project ID to check
 * @returns {Boolean} True if user has access
 */
const hasProjectAccess = async (user, projectId) => {
  try {
    const canViewAll = await PermissionService.hasPermission(
      user,
      "project:read:all"
    );

    if (canViewAll) return true;

    const project = await Project.findById(projectId);
    if (!project) return false;

    const isCreator = project.createdBy.toString() === user._id.toString();
    const isManager =
      project.assignedManager?.toString() === user._id.toString();
    const isTeamMember = project.teamMembers.some(
      (member) => member.user.toString() === user._id.toString()
    );

    return isCreator || isManager || isTeamMember;
  } catch (error) {
    console.error("Check project access error:", error);
    return false;
  }
};

module.exports = {
  getAccessibleProjects,
  hasProjectAccess,
};
