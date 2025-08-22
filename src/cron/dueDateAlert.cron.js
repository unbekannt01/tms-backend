const cron = require("node-cron");
const Task = require("../module/task/models/Task");
const User = require("../module/user/models/User");
const Notification = require("../module/notification/models/Notification");
const emailService = require("../services/emailService");

// Function to check for due date alerts and create notifications
const checkDueDateAlerts = async () => {
  try {
    console.log("[v0] Starting due date alert check...");

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const startOfTomorrow = new Date(
      tomorrow.getFullYear(),
      tomorrow.getMonth(),
      tomorrow.getDate()
    );
    const endOfTomorrow = new Date(
      tomorrow.getFullYear(),
      tomorrow.getMonth(),
      tomorrow.getDate() + 1
    );

    // Find tasks due within 24 hours (due tomorrow)
    const tasksDueSoon = await Task.find({
      dueDate: { $gte: startOfTomorrow, $lt: endOfTomorrow },
      status: { $nin: ["completed", "cancelled"] },
    }).populate("assignedTo", "firstName lastName email");

    // Find overdue tasks (due date passed and not completed)
    const overdueTasks = await Task.find({
      dueDate: { $lt: now },
      status: { $nin: ["completed", "cancelled"] },
    }).populate("assignedTo", "firstName lastName email");

    let dueSoonNotifications = 0;
    let overdueNotifications = 0;
    let emailsSent = 0;

    // Process tasks due soon
    for (const task of tasksDueSoon) {
      try {
        // Check if we already sent a "due soon" notification for this task in the last 24 hours
        const existingNotification = await Notification.findOne({
          relatedTask: task._id,
          type: "task_due_soon",
          createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        });

        if (!existingNotification) {
          // Create due soon notification
          const notification = await Notification.createDueDateNotification(
            task,
            "task_due_soon"
          );
          dueSoonNotifications++;

          // Send email notification
          const emailResult = await emailService.sendDueDateReminderEmail(
            task,
            task.assignedTo,
            false
          );
          if (emailResult.success) {
            notification.isEmailSent = true;
            notification.emailSentAt = new Date();
            await notification.save();
            emailsSent++;
          }

          console.log(
            `[v0] Created due soon notification for task: ${task.title}`
          );
        }
      } catch (error) {
        console.error(
          `[v0] Error processing due soon task ${task._id}:`,
          error
        );
      }
    }

    // Process overdue tasks
    for (const task of overdueTasks) {
      try {
        // Check if we already sent an "overdue" notification for this task in the last 24 hours
        const existingNotification = await Notification.findOne({
          relatedTask: task._id,
          type: "task_overdue",
          createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        });

        if (!existingNotification) {
          // Create overdue notification
          const notification = await Notification.createDueDateNotification(
            task,
            "task_overdue"
          );
          overdueNotifications++;

          // Send email notification
          const emailResult = await emailService.sendDueDateReminderEmail(
            task,
            task.assignedTo,
            true
          );
          if (emailResult.success) {
            notification.isEmailSent = true;
            notification.emailSentAt = new Date();
            await notification.save();
            emailsSent++;
          }

          console.log(
            `[v0] Created overdue notification for task: ${task.title}`
          );
        }
      } catch (error) {
        console.error(`[v0] Error processing overdue task ${task._id}:`, error);
      }
    }

    console.log(`[v0] Due date alert check completed:`);
    console.log(
      `  - Tasks due soon: ${tasksDueSoon.length} (${dueSoonNotifications} new notifications)`
    );
    console.log(
      `  - Overdue tasks: ${overdueTasks.length} (${overdueNotifications} new notifications)`
    );
    console.log(`  - Emails sent: ${emailsSent}`);
  } catch (error) {
    console.error("[v0] Error in due date alert check:", error);
  }
};

// Function to send daily digest emails (optional feature)
const sendDailyDigest = async () => {
  try {
    console.log("[v0] Starting daily digest preparation...");

    // Get all active users
    const activeUsers = await User.find({
      status: "active",
      isDeleted: false,
    }).select("_id firstName lastName email");

    let digestsSent = 0;

    for (const user of activeUsers) {
      try {
        // Get user's pending tasks
        const userTasks = await Task.find({
          assignedTo: user._id,
          status: { $nin: ["completed", "cancelled"] },
        }).select("title dueDate priority status");

        // Get overdue tasks
        const overdueTasks = userTasks.filter(
          (task) => task.dueDate && task.dueDate < new Date()
        );

        // Get tasks due today
        const today = new Date();
        const startOfDay = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        );
        const endOfDay = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() + 1
        );
        const tasksDueToday = userTasks.filter(
          (task) =>
            task.dueDate &&
            task.dueDate >= startOfDay &&
            task.dueDate < endOfDay
        );

        // Only send digest if user has overdue tasks or tasks due today
        if (overdueTasks.length > 0 || tasksDueToday.length > 0) {
          // Create a daily digest notification
          await Notification.create({
            title: `Daily Task Digest - ${overdueTasks.length} overdue, ${tasksDueToday.length} due today`,
            message: `You have ${overdueTasks.length} overdue tasks and ${tasksDueToday.length} tasks due today. Check your dashboard for details.`,
            type: "system_alert",
            priority: overdueTasks.length > 0 ? "high" : "medium",
            recipient: user._id,
            showAsPopup: false,
            metadata: {
              overdueCount: overdueTasks.length,
              dueTodayCount: tasksDueToday.length,
              totalPendingTasks: userTasks.length,
            },
          });

          digestsSent++;
          console.log(
            `[v0] Created daily digest for user: ${user.firstName} ${user.lastName}`
          );
        }
      } catch (error) {
        console.error(
          `[v0] Error creating digest for user ${user._id}:`,
          error
        );
      }
    }

    console.log(`[v0] Daily digest completed: ${digestsSent} digests created`);
  } catch (error) {
    console.error("[v0] Error in daily digest creation:", error);
  }
};

// Run due date check immediately on server start
checkDueDateAlerts();

// Schedule due date alerts every 2 hours during business hours (8 AM to 8 PM)
cron.schedule("0 8-20/2 * * *", () => {
  console.log("[v0] Running scheduled due date alert check...");
  checkDueDateAlerts();
});

// Schedule daily digest at 8 AM every day
cron.schedule("0 8 * * *", () => {
  console.log("[v0] Running daily digest creation...");
  sendDailyDigest();
});

// Additional check at 6 PM for end-of-day reminders
cron.schedule("0 18 * * *", () => {
  console.log("[v0] Running end-of-day due date check...");
  checkDueDateAlerts();
});

console.log("[v0] Due date alert system initialized with schedules:");
console.log("  - Due date checks: Every 2 hours from 8 AM to 8 PM");
console.log("  - Daily digest: 8 AM daily");
console.log("  - End-of-day check: 6 PM daily");
