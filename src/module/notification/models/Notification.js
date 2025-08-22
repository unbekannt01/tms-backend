const mongoose = require("mongoose")

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: [
        "task_assigned",
        "task_due_soon",
        "task_overdue",
        "task_completed",
        "task_updated",
        "login_welcome",
        "system_alert",
        "reminder",
      ],
      required: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    relatedTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    isEmailSent: {
      type: Boolean,
      default: false,
    },
    emailSentAt: {
      type: Date,
    },
    showAsPopup: {
      type: Boolean,
      default: true,
    },
    popupShown: {
      type: Boolean,
      default: false,
    },
    popupShownAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      // Auto-expire notifications after 30 days
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    metadata: {
      taskTitle: String,
      taskDueDate: Date,
      taskPriority: String,
      estimatedHours: Number,
      assignerName: String,
      teamName: String,
    },
  },
  {
    timestamps: true,
    collection: "notifications",
  },
)

// Indexes for better query performance
notificationSchema.index({ recipient: 1, isRead: 1 })
notificationSchema.index({ recipient: 1, createdAt: -1 })
notificationSchema.index({ type: 1, createdAt: -1 })
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
notificationSchema.index({ relatedTask: 1 })
notificationSchema.index({ recipient: 1, popupShown: 1, showAsPopup: 1 })

// Virtual for formatted creation time
notificationSchema.virtual("timeAgo").get(function () {
  const now = new Date()
  const diff = now - this.createdAt
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`
  return "Just now"
})

// Method to mark notification as read
notificationSchema.methods.markAsRead = function () {
  this.isRead = true
  this.readAt = new Date()
  return this.save()
}

// Method to mark popup as shown
notificationSchema.methods.markPopupShown = function () {
  this.popupShown = true
  this.popupShownAt = new Date()
  return this.save()
}

// Static method to create task assignment notification
notificationSchema.statics.createTaskAssignmentNotification = function (taskData, assignerData) {
  return this.create({
    title: `New Task Assigned: ${taskData.title}`,
    message: `You have been assigned a new task "${taskData.title}" by ${assignerData.firstName} ${assignerData.lastName}${taskData.dueDate ? ` due on ${new Date(taskData.dueDate).toLocaleDateString()}` : ""}.`,
    type: "task_assigned",
    priority: taskData.priority || "medium",
    recipient: taskData.assignedTo,
    sender: taskData.createdBy,
    relatedTask: taskData._id,
    showAsPopup: true,
    metadata: {
      taskTitle: taskData.title,
      taskDueDate: taskData.dueDate,
      taskPriority: taskData.priority,
      estimatedHours: taskData.estimatedHours,
      assignerName: `${assignerData.firstName} ${assignerData.lastName}`,
      teamName: assignerData.teamName,
    },
  })
}

// Static method to create due date notification
notificationSchema.statics.createDueDateNotification = function (taskData, type = "task_due_soon") {
  const isOverdue = type === "task_overdue"
  const title = isOverdue ? `Task Overdue: ${taskData.title}` : `Task Due Soon: ${taskData.title}`
  const message = isOverdue
    ? `Your task "${taskData.title}" was due on ${new Date(taskData.dueDate).toLocaleDateString()} and is now overdue.`
    : `Your task "${taskData.title}" is due on ${new Date(taskData.dueDate).toLocaleDateString()}.`

  return this.create({
    title,
    message,
    type,
    priority: isOverdue ? "urgent" : "high",
    recipient: taskData.assignedTo,
    relatedTask: taskData._id,
    showAsPopup: true,
    metadata: {
      taskTitle: taskData.title,
      taskDueDate: taskData.dueDate,
      taskPriority: taskData.priority,
    },
  })
}

// Static method to create login welcome notification
notificationSchema.statics.createLoginWelcomeNotification = function (userId, userData) {
  const currentHour = new Date().getHours()
  let greeting = "Good morning"
  if (currentHour >= 12 && currentHour < 17) greeting = "Good afternoon"
  else if (currentHour >= 17) greeting = "Good evening"

  return this.create({
    title: `${greeting}, ${userData.firstName}!`,
    message: `Welcome back! You have pending tasks and updates waiting for you.`,
    type: "login_welcome",
    priority: "low",
    recipient: userId,
    showAsPopup: true,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expire in 24 hours
  })
}

// Ensure virtual fields are serialized
notificationSchema.set("toJSON", { virtuals: true })
notificationSchema.set("toObject", { virtuals: true })

module.exports = mongoose.model("Notification", notificationSchema)
