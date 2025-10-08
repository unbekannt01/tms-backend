const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "cancelled"],
      default: "pending",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // NEW FIELD: Project reference
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: function() {
        // If task is created by admin/manager, project is required
        // For personal tasks by users, project is optional
        return this.taskType === 'assigned';
      },
    },
    taskType: {
      type: String,
      enum: ["personal", "assigned"],
      default: "assigned", // Tasks created by admin/manager are "assigned"
    },
    dueDate: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    estimatedHours: {
      type: Number,
      min: 0,
    },
    actualHours: {
      type: Number,
      min: 0,
    },
    tags: [{
      type: String,
      trim: true,
    }],
    comments: [commentSchema],
    // Email tracking fields
    dueSoonEmailSent: {
      type: Boolean,
      default: false,
    },
    dueSoonEmailSentAt: {
      type: Date,
    },
    overdueEmailSent: {
      type: Boolean,
      default: false,
    },
    overdueEmailSentAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: "tasks",
  }
);

// Updated indexes for better query performance
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ dueDate: 1, status: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ dueDate: 1, dueSoonEmailSent: 1 });
taskSchema.index({ dueDate: 1, overdueEmailSent: 1 });
taskSchema.index({ projectId: 1 }); // NEW INDEX
taskSchema.index({ projectId: 1, status: 1 }); // NEW INDEX
taskSchema.index({ taskType: 1 }); // NEW INDEX

// Virtual for checking if task is overdue
taskSchema.virtual("isOverdue").get(function () {
  return this.dueDate && this.dueDate < new Date() && this.status !== "completed";
});

// Virtual for days until due
taskSchema.virtual("daysUntilDue").get(function () {
  if (!this.dueDate) return null;
  const now = new Date();
  const diffTime = this.dueDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Ensure virtual fields are serialized
taskSchema.set("toJSON", { virtuals: true });
taskSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Task", taskSchema);