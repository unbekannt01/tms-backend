const Task = require("../models/Task")
const User = require("../../user/models/User")
const PermissionService = require("../../rbac/services/permissionService")
const emailService = require("../../../services/emailService")
const mongoose = require("mongoose")

const createTask = async (req, res) => {
  try {
    const { title, description, assignedTo, dueDate, priority, tags, estimatedHours } = req.body
    const currentUser = req.user

    // Check if user can create tasks for others
    if (assignedTo && assignedTo !== currentUser._id.toString()) {
      const canAssignToOthers = await PermissionService.hasPermission(currentUser, "task:create:others")
      if (!canAssignToOthers) {
        return res.status(403).json({ message: "You can only create tasks for yourself" })
      }
    }

    const task = new Task({
      title,
      description,
      assignedTo: assignedTo || currentUser._id,
      createdBy: currentUser._id,
      dueDate,
      priority,
      tags,
      estimatedHours,
    })

    const savedTask = await task.save()
    await savedTask.populate([
      { path: "assignedTo", select: "firstName lastName userName email" },
      { path: "createdBy", select: "firstName lastName userName email" },
    ])

    if (savedTask.assignedTo && savedTask.assignedTo.email) {
      // Only send if assigned to someone other than creator OR if self-assigned but explicitly requested
      const shouldSendEmail = savedTask.assignedTo._id.toString() !== currentUser._id.toString()

      if (shouldSendEmail) {
        try {
          const emailResult = await emailService.sendTaskAssignmentEmail(
            savedTask,
            savedTask.createdBy,
            savedTask.assignedTo,
          )

          if (emailResult.success) {
            console.log(`[v0] Task assignment email sent to ${savedTask.assignedTo.email}`)
            await Task.findByIdAndUpdate(savedTask._id, {
              assignmentEmailSent: true,
              assignmentEmailSentAt: new Date(),
            })
          } else {
            console.error(`[v0] Failed to send task assignment email: ${emailResult.error}`)
          }
        } catch (emailError) {
          console.error("[v0] Failed to send task assignment email:", emailError)
          // Don't fail the task creation if email fails
        }
      }
    } else {
      console.warn(`[v0] No email address found for assigned user: ${savedTask.assignedTo?._id}`)
    }

    res.status(201).json({
      message: "Task created successfully",
      task: savedTask,
    })
  } catch (error) {
    console.error("Create task error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
}

const getTasks = async (req, res) => {
  try {
    const currentUser = req.user
    const { status, priority, assignedTo, page = 1, limit = 10 } = req.query

    const query = {}

    // Permission-based filtering
    const canViewAll = await PermissionService.hasPermission(currentUser, "task:read:all")
    const canViewTeam = await PermissionService.hasPermission(currentUser, "task:read:team")

    if (canViewAll) {
      // Admin can see all tasks
    } else if (canViewTeam) {
      // Manager can see team tasks + own tasks
      query.$or = [
        { assignedTo: currentUser._id },
        { createdBy: currentUser._id },
        // Add team logic here when teams are implemented
      ]
    } else {
      // Regular user can only see own tasks
      query.$or = [{ assignedTo: currentUser._id }, { createdBy: currentUser._id }]
    }

    // Apply filters
    if (status) query.status = status
    if (priority) query.priority = priority
    if (assignedTo) query.assignedTo = assignedTo

    const skip = (page - 1) * limit
    const total = await Task.countDocuments(query)

    const tasks = await Task.find(query)
      .populate("assignedTo", "firstName lastName userName email")
      .populate("createdBy", "firstName lastName userName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number.parseInt(limit))

    res.json({
      tasks,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Get tasks error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
}

const getTaskById = async (req, res) => {
  try {
    const { id } = req.params
    const currentUser = req.user

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid task ID format" })
    }

    const task = await Task.findById(id)
      .populate("assignedTo", "firstName lastName userName email")
      .populate("createdBy", "firstName lastName userName email")
      .populate("comments.author", "firstName lastName userName")

    if (!task) {
      return res.status(404).json({ message: "Task not found" })
    }

    // Check permissions
    const canViewAll = await PermissionService.hasPermission(currentUser, "task:read:all")
    const canViewTeam = await PermissionService.hasPermission(currentUser, "task:read:team")
    const isOwner = task.assignedTo._id.toString() === currentUser._id.toString()
    const isCreator = task.createdBy._id.toString() === currentUser._id.toString()

    if (!canViewAll && !canViewTeam && !isOwner && !isCreator) {
      return res.status(403).json({ message: "You don't have permission to view this task" })
    }

    res.json(task)
  } catch (error) {
    console.error("Get task by ID error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
}

const updateTask = async (req, res) => {
  try {
    const { id } = req.params
    const currentUser = req.user
    const updateData = req.body

    const task = await Task.findById(id).populate([
      { path: "assignedTo", select: "firstName lastName userName email" },
      { path: "createdBy", select: "firstName lastName userName email" },
    ])

    if (!task) {
      return res.status(404).json({ message: "Task not found" })
    }

    // Store original values for comparison
    const originalAssignedTo = task.assignedTo._id.toString()

    // Check permissions
    const canUpdateAll = await PermissionService.hasPermission(currentUser, "task:update:all")
    const canUpdateTeam = await PermissionService.hasPermission(currentUser, "task:update:team")
    const canUpdateOwn = await PermissionService.hasPermission(currentUser, "task:update:own")
    const isOwner = task.assignedTo._id.toString() === currentUser._id.toString()
    const isCreator = task.createdBy._id.toString() === currentUser._id.toString()

    let canUpdate = false
    if (canUpdateAll) {
      canUpdate = true
    } else if (canUpdateTeam && (isOwner || isCreator)) {
      canUpdate = true
    } else if (canUpdateOwn && isOwner) {
      canUpdate = true
    }

    if (!canUpdate) {
      return res.status(403).json({ message: "You don't have permission to update this task" })
    }

    // Handle status change to completed
    if (updateData.status === "completed" && task.status !== "completed") {
      updateData.completedAt = new Date()
    }

    const updatedTask = await Task.findByIdAndUpdate(id, updateData, {
      new: true,
    })
      .populate("assignedTo", "firstName lastName userName email")
      .populate("createdBy", "firstName lastName userName email")

    try {
      if (updateData.assignedTo && updateData.assignedTo !== originalAssignedTo) {
        const newAssignee = await User.findById(updateData.assignedTo).select("firstName lastName userName email")

        if (newAssignee && newAssignee.email) {
          // Send email even if reassigned to the person making the update (self-assignment)
          const emailResult = await emailService.sendTaskAssignmentEmail(updatedTask, currentUser, newAssignee)

          if (emailResult.success) {
            console.log(`[v0] Task reassignment email sent to ${newAssignee.email}`)
            await Task.findByIdAndUpdate(updatedTask._id, {
              reassignmentEmailSent: true,
              reassignmentEmailSentAt: new Date(),
            })
          } else {
            console.error(`[v0] Failed to send task reassignment email: ${emailResult.error}`)
          }
        } else {
          console.warn(`[v0] No email address found for new assignee: ${updateData.assignedTo}`)
        }
      }
    } catch (emailError) {
      console.error("[v0] Failed to send task reassignment email:", emailError)
      // Don't fail the task update if email fails
    }

    res.json({
      message: "Task updated successfully",
      task: updatedTask,
    })
  } catch (error) {
    console.error("Update task error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
}

const deleteTask = async (req, res) => {
  try {
    const { id } = req.params
    const currentUser = req.user

    const task = await Task.findById(id)
    if (!task) {
      return res.status(404).json({ message: "Task not found" })
    }

    // Check permissions
    const canDeleteAll = await PermissionService.hasPermission(currentUser, "task:delete:all")
    const canDeleteTeam = await PermissionService.hasPermission(currentUser, "task:delete:team")
    const canDeleteOwn = await PermissionService.hasPermission(currentUser, "task:delete:own")
    const isOwner = task.assignedTo.toString() === currentUser._id.toString()
    const isCreator = task.createdBy.toString() === currentUser._id.toString()

    let canDelete = false
    if (canDeleteAll) {
      canDelete = true
    } else if (canDeleteTeam && (isOwner || isCreator)) {
      canDelete = true
    } else if (canDeleteOwn && isOwner) {
      canDelete = true
    }

    if (!canDelete) {
      return res.status(403).json({ message: "You don't have permission to delete this task" })
    }

    await Task.findByIdAndDelete(id)
    res.json({ message: "Task deleted successfully" })
  } catch (error) {
    console.error("Delete task error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
}

const addComment = async (req, res) => {
  try {
    const { id } = req.params
    const { text } = req.body
    const currentUser = req.user

    const task = await Task.findById(id).populate([
      { path: "assignedTo", select: "firstName lastName userName email" },
      { path: "createdBy", select: "firstName lastName userName email" },
    ])

    if (!task) {
      return res.status(404).json({ message: "Task not found" })
    }

    // Check if user can view the task (same logic as getTaskById)
    const canViewAll = await PermissionService.hasPermission(currentUser, "task:read:all")
    const canViewTeam = await PermissionService.hasPermission(currentUser, "task:read:team")
    const isOwner = task.assignedTo._id.toString() === currentUser._id.toString()
    const isCreator = task.createdBy._id.toString() === currentUser._id.toString()

    if (!canViewAll && !canViewTeam && !isOwner && !isCreator) {
      return res.status(403).json({ message: "You don't have permission to comment on this task" })
    }

    task.comments.push({
      text,
      author: currentUser._id,
    })

    await task.save()
    await task.populate("comments.author", "firstName lastName userName")

    res.json({
      message: "Comment added successfully",
      comment: task.comments[task.comments.length - 1],
    })
  } catch (error) {
    console.error("Add comment error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
}

const getTaskStats = async (req, res) => {
  try {
    const currentUser = req.user

    const matchQuery = {}

    // Permission-based filtering
    const canViewAll = await PermissionService.hasPermission(currentUser, "task:read:all")
    const canViewTeam = await PermissionService.hasPermission(currentUser, "task:read:team")

    if (!canViewAll && !canViewTeam) {
      matchQuery.$or = [{ assignedTo: currentUser._id }, { createdBy: currentUser._id }]
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
    ])

    const totalTasks = await Task.countDocuments(matchQuery)
    const overdueTasks = await Task.countDocuments({
      ...matchQuery,
      dueDate: { $lt: new Date() },
      status: { $ne: "completed" },
    })

    res.json({
      totalTasks,
      overdueTasks,
      statusBreakdown: stats,
    })
  } catch (error) {
    console.error("Get task stats error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
}

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  addComment,
  getTaskStats,
}
