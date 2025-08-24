const cron = require("node-cron")
const Task = require("../module/task/models/Task")
const User = require("../module/user/models/User")
const emailService = require("../services/emailService")

class DueDateAlertCron {
  constructor() {
    this.isRunning = false
  }

  async checkDueDateAlerts() {
    if (this.isRunning) {
      console.log("[v0] Due date alert cron already running, skipping...")
      return
    }

    this.isRunning = true
    console.log("[v0] Starting due date alert check...")

    try {
      const now = new Date()
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      const dayAfterTomorrow = new Date(now.getTime() + 48 * 60 * 60 * 1000)

      // Find tasks due soon (within next 24-48 hours)
      const tasksDueSoon = await Task.find({
        dueDate: {
          $gte: tomorrow,
          $lt: dayAfterTomorrow,
        },
        status: { $nin: ["completed", "cancelled"] },
        dueSoonEmailSent: { $ne: true }, // Only send once
      }).populate("assignedTo", "firstName lastName email")

      // Find overdue tasks
      const overdueTasks = await Task.find({
        dueDate: { $lt: now },
        status: { $nin: ["completed", "cancelled"] },
        overdueEmailSent: { $ne: true }, // Only send once
      }).populate("assignedTo", "firstName lastName email")

      let dueSoonEmailsSent = 0
      let overdueEmailsSent = 0

      // Send due soon emails
      for (const task of tasksDueSoon) {
        try {
          if (task.assignedTo && task.assignedTo.email) {
            const emailResult = await emailService.sendDueDateReminderEmail(task, task.assignedTo, false)

            if (emailResult.success) {
              // Mark as email sent to avoid sending again
              await Task.findByIdAndUpdate(task._id, {
                dueSoonEmailSent: true,
                dueSoonEmailSentAt: new Date(),
              })
              dueSoonEmailsSent++
              console.log(`[v0] Due soon email sent for task: ${task.title} to ${task.assignedTo.email}`)
            } else {
              console.error(`[v0] Failed to send due soon email for task ${task._id}: ${emailResult.error}`)
            }
          } else {
            console.warn(`[v0] No email address found for task ${task._id} assigned user`)
          }
        } catch (error) {
          console.error(`[v0] Failed to send due soon email for task ${task._id}:`, error)
        }
      }

      // Send overdue emails
      for (const task of overdueTasks) {
        try {
          if (task.assignedTo && task.assignedTo.email) {
            const emailResult = await emailService.sendDueDateReminderEmail(task, task.assignedTo, true)

            if (emailResult.success) {
              // Mark as email sent to avoid sending again
              await Task.findByIdAndUpdate(task._id, {
                overdueEmailSent: true,
                overdueEmailSentAt: new Date(),
              })
              overdueEmailsSent++
              console.log(`[v0] Overdue email sent for task: ${task.title} to ${task.assignedTo.email}`)
            } else {
              console.error(`[v0] Failed to send overdue email for task ${task._id}: ${emailResult.error}`)
            }
          } else {
            console.warn(`[v0] No email address found for task ${task._id} assigned user`)
          }
        } catch (error) {
          console.error(`[v0] Failed to send overdue email for task ${task._id}:`, error)
        }
      }

      console.log(
        `[v0] Due date alert check completed. Sent ${dueSoonEmailsSent}/${tasksDueSoon.length} due soon emails and ${overdueEmailsSent}/${overdueTasks.length} overdue emails.`,
      )
    } catch (error) {
      console.error("[v0] Error in due date alert cron:", error)
    } finally {
      this.isRunning = false
    }
  }

  start() {
    cron.schedule("0 */2 * * *", () => {
      this.checkDueDateAlerts()
    })

    console.log("[v0] Due date alert cron job scheduled (every 2 hours)")

    setTimeout(() => {
      this.checkDueDateAlerts()
    }, 5000) // Wait 5 seconds after startup
  }
}

const dueDateAlertCron = new DueDateAlertCron()
dueDateAlertCron.start()

module.exports = dueDateAlertCron
