const Notification = require("../models/Notification")
const Task = require("../../task/models/Task")
const mongoose = require("mongoose")

const getNotifications = async (req, res) => {
  try {
    const currentUser = req.user
    const { page = 1, limit = 20, type, isRead } = req.query

    const query = { recipient: currentUser._id }

    // Apply filters
    if (type) query.type = type
    if (isRead !== undefined) query.isRead = isRead === "true"

    const skip = (page - 1) * limit
    const total = await Notification.countDocuments(query)

    const notifications = await Notification.find(query)
      .populate("sender", "firstName lastName userName")
      .populate("relatedTask", "title status priority dueDate")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number.parseInt(limit))

    res.json({
      notifications,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Get notifications error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
}

const getUnreadNotifications = async (req, res) => {
  try {
    const currentUser = req.user

    const notifications = await Notification.find({
      recipient: currentUser._id,
      isRead: false,
    })
      .populate("sender", "firstName lastName userName")
      .populate("relatedTask", "title status priority dueDate")
      .sort({ createdAt: -1 })
      .limit(50) // Limit to prevent overwhelming the user

    res.json({
      notifications,
      count: notifications.length,
    })
  } catch (error) {
    console.error("Get unread notifications error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
}

const getLoginNotifications = async (req, res) => {
  try {
    const currentUser = req.user

    // Get notifications that should show as popups and haven't been shown yet
    const popupNotifications = await Notification.find({
      recipient: currentUser._id,
      showAsPopup: true,
      popupShown: false,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Only last 24 hours
    })
      .populate("sender", "firstName lastName userName")
      .populate("relatedTask", "title status priority dueDate")
      .sort({ priority: 1, createdAt: -1 }) // Urgent first, then by creation time
      .limit(10) // Limit popup notifications

    // Get overdue tasks for the user
    const overdueTasks = await Task.find({
      assignedTo: currentUser._id,
      dueDate: { $lt: new Date() },
      status: { $nin: ["completed", "cancelled"] },
    })
      .select("title dueDate priority")
      .sort({ dueDate: 1 })
      .limit(5)

    // Get tasks due today
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    const tasksDueToday = await Task.find({
      assignedTo: currentUser._id,
      dueDate: { $gte: startOfDay, $lt: endOfDay },
      status: { $nin: ["completed", "cancelled"] },
    })
      .select("title dueDate priority")
      .sort({ dueDate: 1 })
      .limit(5)

    // Create welcome notification if this is a fresh login
    const recentLoginNotification = await Notification.findOne({
      recipient: currentUser._id,
      type: "login_welcome",
      createdAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) }, // Last 30 minutes
    })

    let welcomeNotification = null
    if (!recentLoginNotification) {
      welcomeNotification = await Notification.createLoginWelcomeNotification(currentUser._id, currentUser)
    }

    res.json({
      popupNotifications,
      overdueTasks,
      tasksDueToday,
      welcomeNotification,
      summary: {
        totalUnread: await Notification.countDocuments({
          recipient: currentUser._id,
          isRead: false,
        }),
        overdueCount: overdueTasks.length,
        dueTodayCount: tasksDueToday.length,
      },
    })
  } catch (error) {
    console.error("Get login notifications error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
}

const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params
    const currentUser = req.user

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid notification ID format" })
    }

    const notification = await Notification.findOne({
      _id: id,
      recipient: currentUser._id,
    })

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" })
    }

    await notification.markAsRead()

    res.json({
      message: "Notification marked as read",
      notification,
    })
  } catch (error) {
    console.error("Mark notification as read error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
}

const markAllNotificationsAsRead = async (req, res) => {
  try {
    const currentUser = req.user

    const result = await Notification.updateMany(
      {
        recipient: currentUser._id,
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      },
    )

    res.json({
      message: "All notifications marked as read",
      modifiedCount: result.modifiedCount,
    })
  } catch (error) {
    console.error("Mark all notifications as read error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
}

const markPopupAsShown = async (req, res) => {
  try {
    const { id } = req.params
    const currentUser = req.user

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid notification ID format" })
    }

    const notification = await Notification.findOne({
      _id: id,
      recipient: currentUser._id,
    })

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" })
    }

    await notification.markPopupShown()

    res.json({
      message: "Popup marked as shown",
      notification,
    })
  } catch (error) {
    console.error("Mark popup as shown error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
}

const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params
    const currentUser = req.user

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid notification ID format" })
    }

    const notification = await Notification.findOneAndDelete({
      _id: id,
      recipient: currentUser._id,
    })

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" })
    }

    res.json({ message: "Notification deleted successfully" })
  } catch (error) {
    console.error("Delete notification error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
}

const getNotificationStats = async (req, res) => {
  try {
    const currentUser = req.user

    const stats = await Notification.aggregate([
      { $match: { recipient: currentUser._id } },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          unreadCount: {
            $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] },
          },
        },
      },
    ])

    const totalNotifications = await Notification.countDocuments({
      recipient: currentUser._id,
    })

    const totalUnread = await Notification.countDocuments({
      recipient: currentUser._id,
      isRead: false,
    })

    res.json({
      totalNotifications,
      totalUnread,
      typeBreakdown: stats,
    })
  } catch (error) {
    console.error("Get notification stats error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
}

module.exports = {
  getNotifications,
  getUnreadNotifications,
  getLoginNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  markPopupAsShown,
  deleteNotification,
  getNotificationStats,
}
