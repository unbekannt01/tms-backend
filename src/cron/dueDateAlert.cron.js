const cron = require("node-cron");
const Task = require("../module/task/models/Task");
const User = require("../module/user/models/User");
const emailService = require("../services/emailService");

class DueDateAlertCron {
  constructor() {
    this.isRunning = false;
  }

  async checkDueDateAlerts() {
    if (this.isRunning) {
      console.log("[v0] Due date alert cron already running, skipping...");
      return;
    }

    this.isRunning = true;
    console.log("[v0] Starting due date alert check...");

    try {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const dayAfterTomorrow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      // Find tasks due soon (within next 24-48 hours)
      const tasksDueSoon = await Task.find({
        dueDate: {
          $gte: tomorrow,
          $lt: dayAfterTomorrow,
        },
        status: { $nin: ["completed", "cancelled"] },
        dueSoonEmailSent: { $ne: true }, // Only send once
      }).populate("assignedTo", "firstName lastName email");

      // Find overdue tasks
      const overdueTasks = await Task.find({
        dueDate: { $lt: now },
        status: { $nin: ["completed", "cancelled"] },
        overdueEmailSent: { $ne: true }, // Only send once
      }).populate("assignedTo", "firstName lastName email");

      // Send due soon emails
      for (const task of tasksDueSoon) {
        try {
          if (task.assignedTo && task.assignedTo.email) {
            const emailResult = await emailService.sendDueDateReminderEmail(
              task,
              task.assignedTo,
              false
            );

            if (emailResult.success) {
              // Mark as email sent to avoid sending again
              await Task.findByIdAndUpdate(task._id, {
                dueSoonEmailSent: true,
                dueSoonEmailSentAt: new Date(),
              });
              console.log(`[v0] Due soon email sent for task: ${task.title}`);
            }
          }
        } catch (error) {
          console.error(`[v0] Failed to send due soon email for task ${task._id}:`, error);
        }
      }

      // Send overdue emails
      for (const task of overdueTasks) {
        try {
          if (task.assignedTo && task.assignedTo.email) {
            const emailResult = await emailService.sendDueDateReminderEmail(
              task,
              task.assignedTo,
              true
            );

            if (emailResult.success) {
              // Mark as email sent to avoid sending again
              await Task.findByIdAndUpdate(task._id, {
                overdueEmailSent: true,
                overdueEmailSentAt: new Date(),
              });
              console.log(`[v0] Overdue email sent for task: ${task.title}`);
            }
          }
        } catch (error) {
          console.error(`[v0] Failed to send overdue email for task ${task._id}:`, error);
        }
      }

      console.log(
        `[v0] Due date alert check completed. Processed ${tasksDueSoon.length} due soon and ${overdueTasks.length} overdue tasks.`
      );
    } catch (error) {
      console.error("[v0] Error in due date alert cron:", error);
    } finally {
      this.isRunning = false;
    }
  }

  start() {
    // Run every 6 hours to check for due date alerts
    cron.schedule("0 */6 * * *", () => {
      this.checkDueDateAlerts();
    });

    console.log("[v0] Due date alert cron job scheduled (every 6 hours)");
  }
}

const dueDateAlertCron = new DueDateAlertCron();
dueDateAlertCron.start();

module.exports = dueDateAlertCron;
