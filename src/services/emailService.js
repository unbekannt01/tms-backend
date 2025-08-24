<<<<<<< HEAD
const nodemailer = require("nodemailer");
const config = require("../config/config");
=======
const nodemailer = require("nodemailer")
const config = require("../config/config")
>>>>>>> ad89bbe7c467e48284743d965326f65a93b2250d

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
<<<<<<< HEAD
    });
=======
    })
>>>>>>> ad89bbe7c467e48284743d965326f65a93b2250d
  }

  generateTaskAssignmentEmailTemplate(taskData, assignerData, recipientData) {
    const dueDate = taskData.dueDate
      ? new Date(taskData.dueDate).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
<<<<<<< HEAD
      : "No due date set";
=======
      : "No due date set"
>>>>>>> ad89bbe7c467e48284743d965326f65a93b2250d

    const priorityColors = {
      low: "#10B981",
      medium: "#F59E0B",
      high: "#EF4444",
      urgent: "#DC2626",
<<<<<<< HEAD
    };

    const priorityColor = priorityColors[taskData.priority] || "#6B7280";
=======
    }

    const priorityColor = priorityColors[taskData.priority] || "#6B7280"
>>>>>>> ad89bbe7c467e48284743d965326f65a93b2250d

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Task Assignment</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 600; }
            .content { padding: 40px 30px; }
            .task-card { background-color: #f8fafc; border-radius: 12px; padding: 25px; margin: 20px 0; border-left: 4px solid ${priorityColor}; }
            .task-title { font-size: 24px; font-weight: 700; color: #1f2937; margin-bottom: 10px; }
            .task-meta { display: flex; flex-wrap: wrap; gap: 15px; margin: 20px 0; }
            .meta-item { background: white; padding: 10px 15px; border-radius: 8px; border: 1px solid #e5e7eb; }
            .meta-label { font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600; }
            .meta-value { font-size: 14px; color: #1f2937; font-weight: 500; margin-top: 2px; }
            .priority-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; color: white; background-color: ${priorityColor}; }
            .description { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .footer { background-color: #f8fafc; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
            .divider { height: 1px; background: linear-gradient(to right, transparent, #e5e7eb, transparent); margin: 30px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎯 New Task Assignment</h1>
            </div>
            
            <div class="content">
                <p style="font-size: 18px; color: #374151; margin-bottom: 10px;">Hi <strong>${recipientData.firstName}</strong>,</p>
                <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
                    <strong>${assignerData.firstName} ${assignerData.lastName}</strong> has assigned you a new task. Here are the details:
                </p>

                <div class="task-card">
                    <div class="task-title">${taskData.title}</div>
                    <span class="priority-badge">${taskData.priority} Priority</span>
                    
                    <div class="task-meta">
                        <div class="meta-item">
                            <div class="meta-label">Due Date</div>
                            <div class="meta-value">${dueDate}</div>
                        </div>
                        <div class="meta-item">
                            <div class="meta-label">Estimated Time</div>
                            <div class="meta-value">${taskData.estimatedHours || "Not specified"} hours</div>
                        </div>
                        <div class="meta-item">
                            <div class="meta-label">Assigned By</div>
                            <div class="meta-value">${assignerData.firstName} ${assignerData.lastName}</div>
                        </div>
                    </div>

                    ${
                      taskData.description
                        ? `
                    <div class="description">
                        <strong style="color: #374151;">Description:</strong>
                        <p style="margin: 10px 0 0 0; color: #6b7280; line-height: 1.6;">${taskData.description}</p>
                    </div>
                    `
                        : ""
                    }
                </div>

                <div class="divider"></div>

                <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
                    Click the button below to view and manage your task:
                </p>

                <a href="${config.url.frontend_url || config.url.frontend_local_url}/tasks/${taskData._id}" class="cta-button">
                    View Task Details
                </a>

                <p style="color: #9ca3af; font-size: 14px; margin-top: 30px;">
                    💡 <strong>Pro Tip:</strong> You can update task progress, add comments, and upload files directly from the task page.
                </p>
            </div>

            <div class="footer">
                <p>This is an automated notification from your task management system.</p>
<<<<<<< HEAD
=======
                <p style="margin-top: 10px;">
                    <a href="${config.url.frontend_url || config.url.frontend_local_url}/notifications" style="color: #667eea;">Manage Notifications</a>
                </p>
>>>>>>> ad89bbe7c467e48284743d965326f65a93b2250d
            </div>
        </div>
    </body>
    </html>
<<<<<<< HEAD
    `;
=======
    `
>>>>>>> ad89bbe7c467e48284743d965326f65a93b2250d
  }

  generateDueDateReminderTemplate(taskData, recipientData, isOverdue = false) {
    const dueDate = new Date(taskData.dueDate).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
<<<<<<< HEAD
    });

    const headerColor = isOverdue ? "#DC2626" : "#F59E0B";
    const headerText = isOverdue ? "⚠️ Task Overdue" : "⏰ Task Due Soon";
    const urgencyText = isOverdue ? "overdue" : "due soon";
=======
    })

    const headerColor = isOverdue ? "#DC2626" : "#F59E0B"
    const headerText = isOverdue ? "⚠️ Task Overdue" : "⏰ Task Due Soon"
    const urgencyText = isOverdue ? "overdue" : "due soon"
>>>>>>> ad89bbe7c467e48284743d965326f65a93b2250d

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${headerText}</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background-color: ${headerColor}; padding: 30px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 600; }
            .content { padding: 40px 30px; }
            .alert-box { background-color: ${isOverdue ? "#FEF2F2" : "#FFFBEB"}; border: 2px solid ${headerColor}; border-radius: 12px; padding: 25px; margin: 20px 0; }
            .task-title { font-size: 24px; font-weight: 700; color: #1f2937; margin-bottom: 15px; }
            .due-date { font-size: 18px; color: ${headerColor}; font-weight: 600; }
            .cta-button { display: inline-block; background-color: ${headerColor}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .footer { background-color: #f8fafc; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${headerText}</h1>
            </div>
            
            <div class="content">
                <p style="font-size: 18px; color: #374151; margin-bottom: 20px;">Hi <strong>${recipientData.firstName}</strong>,</p>
                
                <div class="alert-box">
                    <div class="task-title">${taskData.title}</div>
                    <p style="color: #6b7280; margin: 10px 0;">This task is <strong>${urgencyText}</strong>:</p>
                    <div class="due-date">Due: ${dueDate}</div>
                </div>

                <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
                    ${
                      isOverdue
                        ? "Please prioritize this task and update its status as soon as possible."
                        : "Please make sure to complete this task before the due date."
                    }
                </p>

                <a href="${config.url.frontend_url || config.url.frontend_local_url}/tasks/${taskData._id}" class="cta-button">
                    ${isOverdue ? "Update Task Now" : "View Task"}
                </a>
            </div>

            <div class="footer">
                <p>This is an automated reminder from your task management system.</p>
            </div>
        </div>
    </body>
    </html>
<<<<<<< HEAD
    `;
=======
    `
>>>>>>> ad89bbe7c467e48284743d965326f65a93b2250d
  }

  async sendTaskAssignmentEmail(taskData, assignerData, recipientData) {
    try {
<<<<<<< HEAD
      const htmlContent = this.generateTaskAssignmentEmailTemplate(taskData, assignerData, recipientData);
=======
      const htmlContent = this.generateTaskAssignmentEmailTemplate(taskData, assignerData, recipientData)
>>>>>>> ad89bbe7c467e48284743d965326f65a93b2250d

      const mailOptions = {
        from: `"Task Management System" <${config.smtp.user}>`,
        to: recipientData.email,
        subject: `🎯 New Task Assigned: ${taskData.title}`,
        html: htmlContent,
        text: `Hi ${recipientData.firstName},\n\nYou have been assigned a new task "${taskData.title}" by ${assignerData.firstName} ${assignerData.lastName}.\n\nDue Date: ${taskData.dueDate ? new Date(taskData.dueDate).toLocaleDateString() : "Not specified"}\nPriority: ${taskData.priority}\nEstimated Hours: ${taskData.estimatedHours || "Not specified"}\n\nDescription: ${taskData.description || "No description provided"}\n\nView task: ${config.url.frontend_url || config.url.frontend_local_url}/tasks/${taskData._id}`,
<<<<<<< HEAD
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`[v0] Task assignment email sent successfully to ${recipientData.email}:`, result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error(`[v0] Failed to send task assignment email to ${recipientData.email}:`, error);
      return { success: false, error: error.message };
=======
      }

      const result = await this.transporter.sendMail(mailOptions)
      console.log(`[v0] Task assignment email sent successfully to ${recipientData.email}:`, result.messageId)
      return { success: true, messageId: result.messageId }
    } catch (error) {
      console.error(`[v0] Failed to send task assignment email to ${recipientData.email}:`, error)
      return { success: false, error: error.message }
>>>>>>> ad89bbe7c467e48284743d965326f65a93b2250d
    }
  }

  async sendDueDateReminderEmail(taskData, recipientData, isOverdue = false) {
    try {
<<<<<<< HEAD
      const htmlContent = this.generateDueDateReminderTemplate(taskData, recipientData, isOverdue);
      const subject = isOverdue ? `⚠️ Task Overdue: ${taskData.title}` : `⏰ Task Due Soon: ${taskData.title}`;
=======
      const htmlContent = this.generateDueDateReminderTemplate(taskData, recipientData, isOverdue)
      const subject = isOverdue ? `⚠️ Task Overdue: ${taskData.title}` : `⏰ Task Due Soon: ${taskData.title}`
>>>>>>> ad89bbe7c467e48284743d965326f65a93b2250d

      const mailOptions = {
        from: `"Task Management System" <${config.smtp.user}>`,
        to: recipientData.email,
        subject,
        html: htmlContent,
        text: `Hi ${recipientData.firstName},\n\nYour task "${taskData.title}" is ${isOverdue ? "overdue" : "due soon"}.\n\nDue Date: ${new Date(taskData.dueDate).toLocaleDateString()}\n\nView task: ${config.url.frontend_url || config.url.frontend_local_url}/tasks/${taskData._id}`,
<<<<<<< HEAD
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`[v0] Due date reminder email sent successfully to ${recipientData.email}:`, result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error(`[v0] Failed to send due date reminder email to ${recipientData.email}:`, error);
      return { success: false, error: error.message };
    }
  }

  async testConnection() {
    try {
      await this.transporter.verify();
      console.log("[v0] Email service connection verified successfully");
      return { success: true, message: "Email service is ready" };
    } catch (error) {
      console.error("[v0] Email service connection failed:", error);
      return { success: false, error: error.message };
=======
      }

      const result = await this.transporter.sendMail(mailOptions)
      console.log(`[v0] Due date reminder email sent successfully to ${recipientData.email}:`, result.messageId)
      return { success: true, messageId: result.messageId }
    } catch (error) {
      console.error(`[v0] Failed to send due date reminder email to ${recipientData.email}:`, error)
      return { success: false, error: error.message }
    }
  }

  async sendBulkNotificationEmails(notifications) {
    const results = []

    for (const notification of notifications) {
      try {
        let emailResult

        if (notification.type === "task_assigned" && notification.relatedTask) {
          // For task assignments, we need to populate task and user data
          const Task = require("../module/task/models/Task")
          const User = require("../module/user/models/User")

          const taskData = await Task.findById(notification.relatedTask).populate("createdBy assignedTo")
          const recipientData = await User.findById(notification.recipient)

          if (taskData && recipientData) {
            emailResult = await this.sendTaskAssignmentEmail(taskData, taskData.createdBy, recipientData)
          }
        } else if (["task_due_soon", "task_overdue"].includes(notification.type) && notification.relatedTask) {
          const Task = require("../module/task/models/Task")
          const User = require("../module/user/models/User")

          const taskData = await Task.findById(notification.relatedTask)
          const recipientData = await User.findById(notification.recipient)

          if (taskData && recipientData) {
            emailResult = await this.sendDueDateReminderEmail(
              taskData,
              recipientData,
              notification.type === "task_overdue",
            )
          }
        }

        if (emailResult && emailResult.success) {
          // Update notification to mark email as sent
          notification.isEmailSent = true
          notification.emailSentAt = new Date()
          await notification.save()
        }

        results.push({
          notificationId: notification._id,
          success: emailResult ? emailResult.success : false,
          error: emailResult ? emailResult.error : "Unknown notification type",
        })
      } catch (error) {
        console.error(`[v0] Error processing notification ${notification._id}:`, error)
        results.push({
          notificationId: notification._id,
          success: false,
          error: error.message,
        })
      }
    }

    return results
  }

  async testConnection() {
    try {
      await this.transporter.verify()
      console.log("[v0] Email service connection verified successfully")
      return { success: true, message: "Email service is ready" }
    } catch (error) {
      console.error("[v0] Email service connection failed:", error)
      return { success: false, error: error.message }
>>>>>>> ad89bbe7c467e48284743d965326f65a93b2250d
    }
  }
}

<<<<<<< HEAD
module.exports = new EmailService();
=======
module.exports = new EmailService()
>>>>>>> ad89bbe7c467e48284743d965326f65a93b2250d
