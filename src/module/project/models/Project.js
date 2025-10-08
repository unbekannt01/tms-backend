// src/module/project/models/Project.js
const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    name: {
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
      enum: ["active", "on_hold", "completed", "cancelled"],
      default: "active",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      // Optional - can be assigned to a specific manager
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    deadline: {
      type: Date,
    },
    estimatedBudget: {
      type: Number,
      min: 0,
    },
    actualBudget: {
      type: Number,
      min: 0,
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    isArchived: {
      type: Boolean,
      default: false,
    },
    teamMembers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        role: {
          type: String,
          enum: ["lead", "developer", "tester", "designer", "analyst"],
          default: "developer",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
    collection: "projects",
  }
);

// Indexes for better query performance
projectSchema.index({ createdBy: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ priority: 1 });
projectSchema.index({ assignedManager: 1 });
projectSchema.index({ name: "text", description: "text" }); // Text search

// Virtual for task count
projectSchema.virtual("taskCount", {
  ref: "Task",
  localField: "_id",
  foreignField: "projectId",
  count: true,
});

// Virtual for checking if project is overdue
projectSchema.virtual("isOverdue").get(function () {
  return (
    this.deadline && this.deadline < new Date() && this.status !== "completed"
  );
});

// Virtual for days until deadline
projectSchema.virtual("daysUntilDeadline").get(function () {
  if (!this.deadline) return null;
  const now = new Date();
  const diffTime = this.deadline - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Ensure virtual fields are serialized
projectSchema.set("toJSON", { virtuals: true });
projectSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Project", projectSchema);
