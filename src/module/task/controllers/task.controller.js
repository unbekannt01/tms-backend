const Task = require("../models/Task");
const Project = require("../../project/models/Project");
const User = require("../../user/models/User");
const PermissionService = require("../../rbac/services/permissionService");
// const emailService = require("../../../services/emailService");
const mongoose = require("mongoose");
const {
  enhanceTaskDescription: geminiEnhance,
} = require("../../../services/ai/geminiClient");
const config = require("../../../config/config");

const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      assignedTo,
      dueDate,
      priority,
      tags,
      estimatedHours,
      projectId, // NEW FIELD
      taskType = "assigned", // NEW FIELD
    } = req.body;
    const currentUser = req.user;

    // Determine task type based on user role and assignment
    let finalTaskType = taskType;
    const isAssigningToOther =
      assignedTo && assignedTo !== currentUser._id.toString();

    if (isAssigningToOther) {
      const canAssignToOthers = await PermissionService.hasPermission(
        currentUser,
        "task:create:others"
      );
      if (!canAssignToOthers) {
        return res.status(403).json({
          message: "You can only create tasks for yourself",
        });
      }
      finalTaskType = "assigned"; // Tasks assigned to others are always "assigned"
    } else {
      // Self-assigned tasks can be personal or assigned
      finalTaskType = taskType || "personal";
    }

    // Validate project if task is assigned type
    if (finalTaskType === "assigned" && !projectId) {
      return res.status(400).json({
        message: "Project is required for assigned tasks",
      });
    }

    // Validate project exists and user has access
    if (projectId) {
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(400).json({ message: "Project not found" });
      }

      // Check if user can create tasks in this project
      const canViewProject =
        (await PermissionService.hasPermission(
          currentUser,
          "project:read:all"
        )) ||
        project.createdBy.toString() === currentUser._id.toString() ||
        project.assignedManager?.toString() === currentUser._id.toString() ||
        project.teamMembers.some(
          (member) => member.user.toString() === currentUser._id.toString()
        );

      if (!canViewProject) {
        return res.status(403).json({
          message: "You don't have permission to create tasks in this project",
        });
      }

      // Check if project is active
      if (project.status === "cancelled" || project.isArchived) {
        return res.status(400).json({
          message: "Cannot create tasks in cancelled or archived projects",
        });
      }
    }

    const task = new Task({
      title,
      description,
      assignedTo: assignedTo || currentUser._id,
      createdBy: currentUser._id,
      projectId: projectId || null,
      taskType: finalTaskType,
      dueDate,
      priority,
      tags,
      estimatedHours,
    });

    const savedTask = await task.save();
    await savedTask.populate([
      { path: "assignedTo", select: "firstName lastName userName email" },
      { path: "createdBy", select: "firstName lastName userName email" },
      { path: "projectId", select: "name description status priority" }, // NEW POPULATE
    ]);

    // 🔕 Email sending commented out (same as before)

    res.status(201).json({
      message: "Task created successfully",
      task: savedTask,
    });
  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getTasks = async (req, res) => {
  try {
    const currentUser = req.user;
    const {
      status,
      priority,
      assignedTo,
      projectId, // NEW FILTER
      taskType, // NEW FILTER
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    // Permission-based filtering
    const canViewAll = await PermissionService.hasPermission(
      currentUser,
      "task:read:all"
    );
    const canViewTeam = await PermissionService.hasPermission(
      currentUser,
      "task:read:team"
    );

    if (canViewAll) {
      // Admin can see all tasks
    } else if (canViewTeam) {
      // Manager can see team tasks + own tasks + project tasks they have access to
      const accessibleProjects = await Project.find({
        $or: [
          { createdBy: currentUser._id },
          { assignedManager: currentUser._id },
          { "teamMembers.user": currentUser._id },
        ],
      }).select("_id");

      const projectIds = accessibleProjects.map((p) => p._id);

      query.$or = [
        { assignedTo: currentUser._id },
        { createdBy: currentUser._id },
        { projectId: { $in: projectIds } },
      ];
    } else {
      // Regular user can only see own tasks and tasks in projects they're part of
      const accessibleProjects = await Project.find({
        "teamMembers.user": currentUser._id,
      }).select("_id");

      const projectIds = accessibleProjects.map((p) => p._id);

      query.$or = [
        { assignedTo: currentUser._id },
        { createdBy: currentUser._id },
        {
          $and: [
            { projectId: { $in: projectIds } },
            { assignedTo: currentUser._id },
          ],
        },
      ];
    }

    // Apply filters
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;
    if (projectId) query.projectId = projectId;
    if (taskType) query.taskType = taskType;

    const skip = (page - 1) * limit;
    const total = await Task.countDocuments(query);

    const tasks = await Task.find(query)
      .populate("assignedTo", "firstName lastName userName email")
      .populate("createdBy", "firstName lastName userName email")
      .populate("projectId", "name description status priority") // NEW POPULATE
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number.parseInt(limit));

    res.json({
      tasks,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get tasks error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid task ID format" });
    }

    const task = await Task.findById(id)
      .populate("assignedTo", "firstName lastName userName email")
      .populate("createdBy", "firstName lastName userName email")
      .populate(
        "projectId",
        "name description status priority createdBy assignedManager"
      ) // NEW POPULATE
      .populate("comments.author", "firstName lastName userName");

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check permissions (updated to include project-based access)
    const canViewAll = await PermissionService.hasPermission(
      currentUser,
      "task:read:all"
    );
    const canViewTeam = await PermissionService.hasPermission(
      currentUser,
      "task:read:team"
    );
    const isOwner =
      task.assignedTo._id.toString() === currentUser._id.toString();
    const isCreator =
      task.createdBy._id.toString() === currentUser._id.toString();

    // Check project access
    let hasProjectAccess = false;
    if (task.projectId) {
      hasProjectAccess =
        task.projectId.createdBy?.toString() === currentUser._id.toString() ||
        task.projectId.assignedManager?.toString() ===
          currentUser._id.toString();

      if (!hasProjectAccess) {
        const fullProject = await Project.findById(task.projectId._id);
        hasProjectAccess = fullProject?.teamMembers.some(
          (member) => member.user.toString() === currentUser._id.toString()
        );
      }
    }

    if (
      !canViewAll &&
      !canViewTeam &&
      !isOwner &&
      !isCreator &&
      !hasProjectAccess
    ) {
      return res.status(403).json({
        message: "You don't have permission to view this task",
      });
    }

    res.json(task);
  } catch (error) {
    console.error("Get task by ID error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update and Delete functions remain mostly the same, just add project population
const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;
    const updateData = req.body;

    const task = await Task.findById(id).populate([
      { path: "assignedTo", select: "firstName lastName userName email" },
      { path: "createdBy", select: "firstName lastName userName email" },
      { path: "projectId", select: "name description status" },
    ]);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Validate project if being updated
    if (
      updateData.projectId &&
      updateData.projectId !== task.projectId?.toString()
    ) {
      const project = await Project.findById(updateData.projectId);
      if (!project) {
        return res.status(400).json({ message: "Project not found" });
      }

      if (project.status === "cancelled" || project.isArchived) {
        return res.status(400).json({
          message: "Cannot assign task to cancelled or archived project",
        });
      }
    }

    const originalAssignedTo = task.assignedTo._id.toString();

    const canUpdateAll = await PermissionService.hasPermission(
      currentUser,
      "task:update:all"
    );
    const canUpdateTeam = await PermissionService.hasPermission(
      currentUser,
      "task:update:team"
    );
    const canUpdateOwn = await PermissionService.hasPermission(
      currentUser,
      "task:update:own"
    );
    const isOwner =
      task.assignedTo._id.toString() === currentUser._id.toString();
    const isCreator =
      task.createdBy._id.toString() === currentUser._id.toString();

    let canUpdate = false;
    if (canUpdateAll) {
      canUpdate = true;
    } else if (canUpdateTeam && (isOwner || isCreator)) {
      canUpdate = true;
    } else if (canUpdateOwn && isOwner) {
      canUpdate = true;
    }

    if (!canUpdate) {
      return res.status(403).json({
        message: "You don't have permission to update this task",
      });
    }

    if (updateData.status === "completed" && task.status !== "completed") {
      updateData.completedAt = new Date();
    }

    const updatedTask = await Task.findByIdAndUpdate(id, updateData, {
      new: true,
    })
      .populate("assignedTo", "firstName lastName userName email")
      .populate("createdBy", "firstName lastName userName email")
      .populate("projectId", "name description status priority"); // NEW POPULATE

    res.json({
      message: "Task updated successfully",
      task: updatedTask,
    });
  } catch (error) {
    console.error("Update task error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Rest of the functions (deleteTask, addComment, getTaskStats, enhanceTaskDescription)
// remain the same but add project population where needed

const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check permissions
    const canDeleteAll = await PermissionService.hasPermission(
      currentUser,
      "task:delete:all"
    );
    const canDeleteTeam = await PermissionService.hasPermission(
      currentUser,
      "task:delete:team"
    );
    const canDeleteOwn = await PermissionService.hasPermission(
      currentUser,
      "task:delete:own"
    );
    const isOwner = task.assignedTo.toString() === currentUser._id.toString();
    const isCreator = task.createdBy.toString() === currentUser._id.toString();

    let canDelete = false;
    if (canDeleteAll) {
      canDelete = true;
    } else if (canDeleteTeam && (isOwner || isCreator)) {
      canDelete = true;
    } else if (canDeleteOwn && isOwner) {
      canDelete = true;
    }

    if (!canDelete) {
      return res.status(403).json({
        message: "You don't have permission to delete this task",
      });
    }

    await Task.findByIdAndDelete(id);
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Delete task error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const currentUser = req.user;

    const task = await Task.findById(id).populate([
      { path: "assignedTo", select: "firstName lastName userName email" },
      { path: "createdBy", select: "firstName lastName userName email" },
      { path: "projectId", select: "name description" },
    ]);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check if user can view the task (same logic as getTaskById)
    const canViewAll = await PermissionService.hasPermission(
      currentUser,
      "task:read:all"
    );
    const canViewTeam = await PermissionService.hasPermission(
      currentUser,
      "task:read:team"
    );
    const isOwner =
      task.assignedTo._id.toString() === currentUser._id.toString();
    const isCreator =
      task.createdBy._id.toString() === currentUser._id.toString();

    if (!canViewAll && !canViewTeam && !isOwner && !isCreator) {
      return res.status(403).json({
        message: "You don't have permission to comment on this task",
      });
    }

    task.comments.push({
      text,
      author: currentUser._id,
    });

    await task.save();
    await task.populate("comments.author", "firstName lastName userName");

    res.json({
      message: "Comment added successfully",
      comment: task.comments[task.comments.length - 1],
    });
  } catch (error) {
    console.error("Add comment error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getTaskStats = async (req, res) => {
  try {
    const currentUser = req.user;

    const matchQuery = {};

    // Permission-based filtering (same as getTasks)
    const canViewAll = await PermissionService.hasPermission(
      currentUser,
      "task:read:all"
    );
    const canViewTeam = await PermissionService.hasPermission(
      currentUser,
      "task:read:team"
    );

    if (!canViewAll && !canViewTeam) {
      matchQuery.$or = [
        { assignedTo: currentUser._id },
        { createdBy: currentUser._id },
      ];
    }

    const stats = await Task.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          avgHours: { $avg: "$estimatedHours" },
        },
      },
    ]);

    const totalTasks = await Task.countDocuments(matchQuery);
    const overdueTasks = await Task.countDocuments({
      ...matchQuery,
      dueDate: { $lt: new Date() },
      status: { $ne: "completed" },
    });

    // NEW: Task type breakdown
    const taskTypeStats = await Task.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$taskType",
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      totalTasks,
      overdueTasks,
      statusBreakdown: stats,
      taskTypeBreakdown: taskTypeStats, // NEW
    });
  } catch (error) {
    console.error("Get task stats error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const enhanceTaskDescription = async (req, res) => {
  try {
    const { title = "", description = "" } = req.body || {};
    if (
      !description ||
      typeof description !== "string" ||
      !description.trim()
    ) {
      return res.status(400).json({ message: "Description is required" });
    }

    // Optional: basic length guardrails
    if (description.length > 20000) {
      return res.status(413).json({ message: "Description too large" });
    }

    if (!config.ai?.gemini?.enabled) {
      return res.status(503).json({ message: "AI enhancement is disabled" });
    }

    const enhanced = await geminiEnhance({ title, description });
    return res.status(200).json({ enhancedDescription: enhanced });
  } catch (error) {
    console.error("Enhance description error:", error);
    const status = error.status || 500;
    return res.status(status).json({
      message: error.message || "Failed to enhance description",
    });
  }
};

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  addComment,
  getTaskStats,
  enhanceTaskDescription,
};
