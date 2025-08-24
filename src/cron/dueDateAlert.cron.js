const cron = require("node-cron");
const Task = require("../module/task/models/Task");
const User = require("../module/user/models/User");
const emailService = require("../services/emailService");
const logger = require("../utils/logger");

class DueDateAlertCron {
  constructor() {
    this.isRunning = false;
  }

  async checkDueDateAlerts() {
    if (this.isRunning) {
      logger.warn("[v0] Due date alert cron already running, skipping...");
      return;
    }

    this.isRunning = true;
    logger.info("[v0] Starting due date alert check...");

    try {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const dayAfterTomorrow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      // Find tasks due soon (within next 24-48 hours)
      const tasksDueSoon = await Task.find({
        dueDate: { $gte: tomorrow, $lt: dayAfterTomorrow },
        status: { $nin: ["completed", "cancelled"] },
        dueSoonEmailSent: { $ne: true },
      }).populate("assignedTo", "firstName lastName email");

      // Find overdue tasks
      const overdueTasks = await Task.find({
        dueDate: { $lt: now },
        status: { $nin: ["completed", "cancelled"] },
        overdueEmailSent: { $ne: true },
      }).populate("assignedTo", "firstName lastName email");

      let dueSoonEmailsSent = 0;
      let overdueEmailsSent = 0;

      // Send due soon emails
      for (const task of tasksDueSoon) {
        try {
          if (task.assignedTo?.email) {
            const emailResult = await emailService.sendDueDateReminderEmail(task, task.assignedTo, false);

            if (emailResult.success) {
              await Task.findByIdAndUpdate(task._id, {
                dueSoonEmailSent: true,
                dueSoonEmailSentAt: new Date(),
              });
              dueSoonEmailsSent++;
              logger.info(`[v0] Due soon email sent for task: "${task.title}" to ${task.assignedTo.email}`);
            } else {
              logger.error(`[v0] Failed to send due soon email for task ${task._id}: ${emailResult.error}`);
            }
          } else {
            logger.warn(`[v0] No email address found for task ${task._id} assigned user`);
          }
        } catch (error) {
          logger.error(`[v0] Failed to send due soon email for task ${task._id}: ${error.message}`);
        }
      }

      // Send overdue emails
      for (const task of overdueTasks) {
        try {
          if (task.assignedTo?.email) {
            const emailResult = await emailService.sendDueDateReminderEmail(task, task.assignedTo, true);

            if (emailResult.success) {
              await Task.findByIdAndUpdate(task._id, {
                overdueEmailSent: true,
                overdueEmailSentAt: new Date(),
              });
              overdueEmailsSent++;
              logger.info(`[v0] Overdue email sent for task: "${task.title}" to ${task.assignedTo.email}`);
            } else {
              logger.error(`[v0] Failed to send overdue email for task ${task._id}: ${emailResult.error}`);
            }
          } else {
            logger.warn(`[v0] No email address found for task ${task._id} assigned user`);
          }
        } catch (error) {
          logger.error(`[v0] Failed to send overdue email for task ${task._id}: ${error.message}`);
        }
      }

      logger.info(
        `[v0] Due date alert check completed. Sent ${dueSoonEmailsSent}/${tasksDueSoon.length} due soon emails and ${overdueEmailsSent}/${overdueTasks.length} overdue emails.`
      );
    } catch (error) {
      logger.error("[v0] Error in due date alert cron:", error);
    } finally {
      this.isRunning = false;
    }
  }

  start() {
    cron.schedule("0 */2 * * *", () => {
      this.checkDueDateAlerts();
    });

    logger.info("[v0] Due date alert cron job scheduled (every 2 hours)");

    setTimeout(() => {
      this.checkDueDateAlerts();
    }, 5000);
  }
}

const dueDateAlertCron = new DueDateAlertCron();
dueDateAlertCron.start();

module.exports = dueDateAlertCron;
