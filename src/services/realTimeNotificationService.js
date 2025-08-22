const socketService = require("./socketService")
const Notification = require("../module/notification/models/Notification")

class RealTimeNotificationService {
  // Create and broadcast notification
  async createAndBroadcastNotification(notificationData) {
    try {
      // Create notification in database
      const notification = await Notification.create(notificationData)
      await notification.populate("sender", "firstName lastName userName")
      await notification.populate("relatedTask", "title status priority dueDate")

      // Send real-time notification
      const sent = socketService.sendRealTimeNotification(notification)

      console.log(`[v0] Created and ${sent ? "broadcasted" : "stored"} notification: ${notification.title}`)
      return notification
    } catch (error) {
      console.error("[v0] Error creating real-time notification:", error)
      throw error
    }
  }

  // Broadcast task assignment
  async broadcastTaskAssignment(taskData, assignerData, recipientId) {
    try {
      const notification = await Notification.createTaskAssignmentNotification(taskData, assignerData)

      // Send real-time notification
      socketService.sendRealTimeNotification(notification)

      // Also broadcast to task room if anyone is watching
      socketService.broadcastToTask(taskData._id, "task:assigned", {
        task: {
          _id: taskData._id,
          title: taskData.title,
          assignedTo: recipientId,
          assignedBy: assignerData._id,
          dueDate: taskData.dueDate,
          priority: taskData.priority,
        },
        assigner: {
          _id: assignerData._id,
          name: `${assignerData.firstName} ${assignerData.lastName}`,
        },
      })

      return notification
    } catch (error) {
      console.error("[v0] Error broadcasting task assignment:", error)
      throw error
    }
  }

  // Broadcast task update
  async broadcastTaskUpdate(taskData, updaterData, updateType = "updated") {
    try {
      // Broadcast to task room
      socketService.broadcastToTask(
        taskData._id,
        "task:updated",
        {
          task: {
            _id: taskData._id,
            title: taskData.title,
            status: taskData.status,
            priority: taskData.priority,
            dueDate: taskData.dueDate,
          },
          updater: {
            _id: updaterData._id,
            name: `${updaterData.firstName} ${updaterData.lastName}`,
          },
          updateType,
        },
        updaterData._id.toString(),
      )

      // If task is completed, notify the creator
      if (updateType === "completed" && taskData.createdBy.toString() !== updaterData._id.toString()) {
        const notification = await this.createAndBroadcastNotification({
          title: `Task Completed: ${taskData.title}`,
          message: `${updaterData.firstName} ${updaterData.lastName} has completed the task "${taskData.title}".`,
          type: "task_completed",
          priority: "medium",
          recipient: taskData.createdBy,
          sender: updaterData._id,
          relatedTask: taskData._id,
          showAsPopup: true,
          metadata: {
            taskTitle: taskData.title,
            completedBy: `${updaterData.firstName} ${updaterData.lastName}`,
          },
        })

        return notification
      }
    } catch (error) {
      console.error("[v0] Error broadcasting task update:", error)
      throw error
    }
  }

  // Broadcast new comment
  async broadcastTaskComment(taskData, commenterData, commentText) {
    try {
      // Broadcast to task room
      socketService.broadcastToTask(
        taskData._id,
        "task:comment_added",
        {
          task: {
            _id: taskData._id,
            title: taskData.title,
          },
          comment: {
            text: commentText,
            author: {
              _id: commenterData._id,
              name: `${commenterData.firstName} ${commenterData.lastName}`,
            },
            createdAt: new Date(),
          },
        },
        commenterData._id.toString(),
      )

      // Create notifications for task participants
      const notifyUsers = []

      if (taskData.assignedTo.toString() !== commenterData._id.toString()) {
        notifyUsers.push(taskData.assignedTo)
      }

      if (
        taskData.createdBy.toString() !== commenterData._id.toString() &&
        taskData.createdBy.toString() !== taskData.assignedTo.toString()
      ) {
        notifyUsers.push(taskData.createdBy)
      }

      // Create and broadcast notifications
      const notifications = []
      for (const userId of notifyUsers) {
        const notification = await this.createAndBroadcastNotification({
          title: `New Comment on: ${taskData.title}`,
          message: `${commenterData.firstName} ${commenterData.lastName} added a comment: "${commentText.substring(0, 100)}${commentText.length > 100 ? "..." : ""}"`,
          type: "task_updated",
          priority: "low",
          recipient: userId,
          sender: commenterData._id,
          relatedTask: taskData._id,
          showAsPopup: false,
          metadata: {
            taskTitle: taskData.title,
            commentText: commentText.substring(0, 200),
            commenterName: `${commenterData.firstName} ${commenterData.lastName}`,
          },
        })
        notifications.push(notification)
      }

      return notifications
    } catch (error) {
      console.error("[v0] Error broadcasting task comment:", error)
      throw error
    }
  }

  // Broadcast due date alerts
  async broadcastDueDateAlert(taskData, alertType = "due_soon") {
    try {
      const notification = await Notification.createDueDateNotification(
        taskData,
        alertType === "overdue" ? "task_overdue" : "task_due_soon",
      )

      // Send real-time notification
      socketService.sendRealTimeNotification(notification)

      // Also broadcast to task room
      socketService.broadcastToTask(taskData._id, "task:due_date_alert", {
        task: {
          _id: taskData._id,
          title: taskData.title,
          dueDate: taskData.dueDate,
          priority: taskData.priority,
        },
        alertType,
      })

      return notification
    } catch (error) {
      console.error("[v0] Error broadcasting due date alert:", error)
      throw error
    }
  }

  // Get real-time stats
  getRealTimeStats() {
    return {
      onlineUsers: socketService.getOnlineUsersCount(),
      timestamp: new Date(),
    }
  }

  // Broadcast system announcement
  async broadcastSystemAnnouncement(title, message, priority = "medium") {
    try {
      // This would broadcast to all connected users
      if (socketService.io) {
        socketService.io.emit("system:announcement", {
          title,
          message,
          priority,
          timestamp: new Date(),
        })
        console.log(`[v0] Broadcasted system announcement: ${title}`)
      }
    } catch (error) {
      console.error("[v0] Error broadcasting system announcement:", error)
      throw error
    }
  }
}

module.exports = new RealTimeNotificationService()
