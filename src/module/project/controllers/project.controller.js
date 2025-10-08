// src/module/project/controllers/project.controller.js
const Project = require("../models/Project");
const Task = require("../../task/models/Task");
const User = require("../../user/models/User");
const PermissionService = require("../../rbac/services/permissionService");
const mongoose = require("mongoose");

const createProject = async (req, res) => {
  try {
    const {
      name,
      description,
      status = "active",
      priority = "medium",
      assignedManager,
      startDate,
      endDate,
      deadline,
      estimatedBudget,
      tags,
      teamMembers,
    } = req.body;
    const currentUser = req.user;

    // Check if user has permission to create projects
    const canCreateProject = await PermissionService.hasPermission(
      currentUser,
      "project:create"
    );
    
    if (!canCreateProject) {
      return res.status(403).json({ 
        message: "You don't have permission to create projects" 
      });
    }

    // Validate assigned manager if provided
    if (assignedManager) {
      const manager = await User.findById(assignedManager).populate('roleId');
      if (!manager) {
        return res.status(400).json({ message: "Assigned manager not found" });
      }
      
      // Check if assigned user is manager or admin
      if (!['admin', 'manager'].includes(manager.roleId?.name)) {
        return res.status(400).json({ 
          message: "Assigned manager must have admin or manager role" 
        });
      }
    }

    const project = new Project({
      name,
      description,
      status,
      priority,
      createdBy: currentUser._id,
      assignedManager: assignedManager || currentUser._id,
      startDate: startDate || new Date(),
      endDate,
      deadline,
      estimatedBudget,
      tags,
      teamMembers: teamMembers || [],
    });

    const savedProject = await project.save();
    await savedProject.populate([
      { path: "createdBy", select: "firstName lastName userName email" },
      { path: "assignedManager", select: "firstName lastName userName email" },
      { path: "teamMembers.user", select: "firstName lastName userName email" },
    ]);

    res.status(201).json({
      message: "Project created successfully",
      project: savedProject,
    });
  } catch (error) {
    console.error("Create project error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Project name already exists" });
    }
    res.status(500).json({ message: "Internal server error" });
  }
};

const getProjects = async (req, res) => {
  try {
    const currentUser = req.user;
    const { 
      status, 
      priority, 
      assignedManager, 
      search,
      page = 1, 
      limit = 10,
      includeArchived = false 
    } = req.query;

    const query = {};

    // Permission-based filtering
    const canViewAll = await PermissionService.hasPermission(
      currentUser,
      "project:read:all"
    );
    const canViewTeam = await PermissionService.hasPermission(
      currentUser,
      "project:read:team"
    );

    if (!canViewAll) {
      if (canViewTeam) {
        // Manager can see projects they created or are assigned to
        query.$or = [
          { createdBy: currentUser._id },
          { assignedManager: currentUser._id },
          { "teamMembers.user": currentUser._id },
        ];
      } else {
        // Regular user can see projects they are part of
        query.$or = [
          { createdBy: currentUser._id },
          { "teamMembers.user": currentUser._id },
        ];
      }
    }

    // Apply filters
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignedManager) query.assignedManager = assignedManager;
    if (!includeArchived || includeArchived === 'false') {
      query.isArchived = false;
    }

    // Search functionality
    if (search) {
      query.$text = { $search: search };
    }

    const skip = (page - 1) * limit;
    const total = await Project.countDocuments(query);

    const projects = await Project.find(query)
      .populate("createdBy", "firstName lastName userName email")
      .populate("assignedManager", "firstName lastName userName email")
      .populate("teamMembers.user", "firstName lastName userName email")
      .populate("taskCount")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number.parseInt(limit));

    res.json({
      projects,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get projects error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid project ID format" });
    }

    const project = await Project.findById(id)
      .populate("createdBy", "firstName lastName userName email")
      .populate("assignedManager", "firstName lastName userName email")
      .populate("teamMembers.user", "firstName lastName userName email")
      .populate("taskCount");

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Check permissions
    const canViewAll = await PermissionService.hasPermission(
      currentUser,
      "project:read:all"
    );
    const canViewTeam = await PermissionService.hasPermission(
      currentUser,
      "project:read:team"
    );
    const isCreator = project.createdBy._id.toString() === currentUser._id.toString();
    const isAssignedManager = project.assignedManager && 
      project.assignedManager._id.toString() === currentUser._id.toString();
    const isTeamMember = project.teamMembers.some(
      member => member.user._id.toString() === currentUser._id.toString()
    );

    if (!canViewAll && !canViewTeam && !isCreator && !isAssignedManager && !isTeamMember) {
      return res.status(403).json({ 
        message: "You don't have permission to view this project" 
      });
    }

    // Get project tasks
    const tasks = await Task.find({ projectId: id })
      .populate("assignedTo", "firstName lastName userName email")
      .populate("createdBy", "firstName lastName userName email")
      .sort({ createdAt: -1 });

    res.json({
      project,
      tasks,
    });
  } catch (error) {
    console.error("Get project by ID error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;
    const updateData = req.body;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Check permissions
    const canUpdateAll = await PermissionService.hasPermission(
      currentUser,
      "project:update:all"
    );
    const canUpdateTeam = await PermissionService.hasPermission(
      currentUser,
      "project:update:team"
    );
    const canUpdateOwn = await PermissionService.hasPermission(
      currentUser,
      "project:update:own"
    );
    const isCreator = project.createdBy.toString() === currentUser._id.toString();
    const isAssignedManager = project.assignedManager && 
      project.assignedManager.toString() === currentUser._id.toString();

    let canUpdate = false;
    if (canUpdateAll) {
      canUpdate = true;
    } else if (canUpdateTeam && (isCreator || isAssignedManager)) {
      canUpdate = true;
    } else if (canUpdateOwn && isCreator) {
      canUpdate = true;
    }

    if (!canUpdate) {
      return res.status(403).json({ 
        message: "You don't have permission to update this project" 
      });
    }

    // Validate assigned manager if being updated
    if (updateData.assignedManager) {
      const manager = await User.findById(updateData.assignedManager).populate('roleId');
      if (!manager) {
        return res.status(400).json({ message: "Assigned manager not found" });
      }
      
      if (!['admin', 'manager'].includes(manager.roleId?.name)) {
        return res.status(400).json({ 
          message: "Assigned manager must have admin or manager role" 
        });
      }
    }

    const updatedProject = await Project.findByIdAndUpdate(id, updateData, {
      new: true,
    })
      .populate("createdBy", "firstName lastName userName email")
      .populate("assignedManager", "firstName lastName userName email")
      .populate("teamMembers.user", "firstName lastName userName email");

    res.json({
      message: "Project updated successfully",
      project: updatedProject,
    });
  } catch (error) {
    console.error("Update project error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Check permissions
    const canDeleteAll = await PermissionService.hasPermission(
      currentUser,
      "project:delete:all"
    );
    const canDeleteTeam = await PermissionService.hasPermission(
      currentUser,
      "project:delete:team"
    );
    const canDeleteOwn = await PermissionService.hasPermission(
      currentUser,
      "project:delete:own"
    );
    const isCreator = project.createdBy.toString() === currentUser._id.toString();
    const isAssignedManager = project.assignedManager && 
      project.assignedManager.toString() === currentUser._id.toString();

    let canDelete = false;
    if (canDeleteAll) {
      canDelete = true;
    } else if (canDeleteTeam && (isCreator || isAssignedManager)) {
      canDelete = true;
    } else if (canDeleteOwn && isCreator) {
      canDelete = true;
    }

    if (!canDelete) {
      return res.status(403).json({ 
        message: "You don't have permission to delete this project" 
      });
    }

    // Check if project has tasks
    const taskCount = await Task.countDocuments({ projectId: id });
    if (taskCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete project. It has ${taskCount} associated tasks. Please delete or reassign tasks first.` 
      });
    }

    await Project.findByIdAndDelete(id);
    res.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Delete project error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const archiveProject = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Same permission check as update
    const canUpdateAll = await PermissionService.hasPermission(
      currentUser,
      "project:update:all"
    );
    const canUpdateTeam = await PermissionService.hasPermission(
      currentUser,
      "project:update:team"
    );
    const isCreator = project.createdBy.toString() === currentUser._id.toString();
    const isAssignedManager = project.assignedManager && 
      project.assignedManager.toString() === currentUser._id.toString();

    if (!canUpdateAll && !(canUpdateTeam && (isCreator || isAssignedManager))) {
      return res.status(403).json({ 
        message: "You don't have permission to archive this project" 
      });
    }

    const updatedProject = await Project.findByIdAndUpdate(
      id,
      { isArchived: !project.isArchived },
      { new: true }
    ).populate("createdBy", "firstName lastName userName email")
     .populate("assignedManager", "firstName lastName userName email");

    res.json({
      message: `Project ${project.isArchived ? 'unarchived' : 'archived'} successfully`,
      project: updatedProject,
    });
  } catch (error) {
    console.error("Archive project error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const addTeamMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role = "developer" } = req.body;
    const currentUser = req.user;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Check permissions (same as update)
    const canUpdateAll = await PermissionService.hasPermission(
      currentUser,
      "project:update:all"
    );
    const canUpdateTeam = await PermissionService.hasPermission(
      currentUser,
      "project:update:team"
    );
    const isCreator = project.createdBy.toString() === currentUser._id.toString();
    const isAssignedManager = project.assignedManager && 
      project.assignedManager.toString() === currentUser._id.toString();

    if (!canUpdateAll && !(canUpdateTeam && (isCreator || isAssignedManager))) {
      return res.status(403).json({ 
        message: "You don't have permission to modify project team" 
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Check if user is already a team member
    const existingMember = project.teamMembers.find(
      member => member.user.toString() === userId
    );
    if (existingMember) {
      return res.status(400).json({ message: "User is already a team member" });
    }

    project.teamMembers.push({
      user: userId,
      role,
      joinedAt: new Date(),
    });

    await project.save();
    await project.populate("teamMembers.user", "firstName lastName userName email");

    res.json({
      message: "Team member added successfully",
      project,
    });
  } catch (error) {
    console.error("Add team member error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const removeTeamMember = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const currentUser = req.user;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Check permissions (same as update)
    const canUpdateAll = await PermissionService.hasPermission(
      currentUser,
      "project:update:all"
    );
    const canUpdateTeam = await PermissionService.hasPermission(
      currentUser,
      "project:update:team"
    );
    const isCreator = project.createdBy.toString() === currentUser._id.toString();
    const isAssignedManager = project.assignedManager && 
      project.assignedManager.toString() === currentUser._id.toString();

    if (!canUpdateAll && !(canUpdateTeam && (isCreator || isAssignedManager))) {
      return res.status(403).json({ 
        message: "You don't have permission to modify project team" 
      });
    }

    // Remove team member
    project.teamMembers = project.teamMembers.filter(
      member => member.user.toString() !== userId
    );

    await project.save();
    await project.populate("teamMembers.user", "firstName lastName userName email");

    res.json({
      message: "Team member removed successfully",
      project,
    });
  } catch (error) {
    console.error("Remove team member error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getProjectStats = async (req, res) => {
  try {
    const currentUser = req.user;

    const matchQuery = {};

    // Permission-based filtering
    const canViewAll = await PermissionService.hasPermission(
      currentUser,
      "project:read:all"
    );
    const canViewTeam = await PermissionService.hasPermission(
      currentUser,
      "project:read:team"
    );

    if (!canViewAll) {
      if (canViewTeam) {
        matchQuery.$or = [
          { createdBy: currentUser._id },
          { assignedManager: currentUser._id },
          { "teamMembers.user": currentUser._id },
        ];
      } else {
        matchQuery.$or = [
          { createdBy: currentUser._id },
          { "teamMembers.user": currentUser._id },
        ];
      }
    }

    const stats = await Project.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          avgProgress: { $avg: "$progress" },
        },
      },
    ]);

    const totalProjects = await Project.countDocuments(matchQuery);
    const overdueProjects = await Project.countDocuments({
      ...matchQuery,
      deadline: { $lt: new Date() },
      status: { $nin: ["completed", "cancelled"] },
    });

    const archivedProjects = await Project.countDocuments({
      ...matchQuery,
      isArchived: true,
    });

    res.json({
      totalProjects,
      overdueProjects,
      archivedProjects,
      statusBreakdown: stats,
    });
  } catch (error) {
    console.error("Get project stats error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  archiveProject,
  addTeamMember,
  removeTeamMember,
  getProjectStats,
};