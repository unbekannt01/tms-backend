const mongoose = require("mongoose")

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
})

const aiEnhancementSchema = new mongoose.Schema({
  originalDescription: {
    type: String,
    required: true,
  },
  enhancedDescription: {
    type: String,
    required: true,
  },
  summary: {
    type: String,
    required: true,
  },
  keyPoints: [
    {
      type: String,
    },
  ],
  estimatedComplexity: {
    type: String,
    enum: ["low", "medium", "high"],
    default: "medium",
  },
  enhancedAt: {
    type: Date,
    default: Date.now,
  },
  enhancedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
})

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
    aiEnhancement: {
      type: aiEnhancementSchema,
      default: null,
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
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
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
  },
)

// Indexes for better query performance
taskSchema.index({ assignedTo: 1, status: 1 })
taskSchema.index({ createdBy: 1 })
taskSchema.index({ dueDate: 1, status: 1 })
taskSchema.index({ priority: 1 })
taskSchema.index({ status: 1 })
taskSchema.index({ dueDate: 1, dueSoonEmailSent: 1 })
taskSchema.index({ dueDate: 1, overdueEmailSent: 1 })
taskSchema.index({ "aiEnhancement.enhancedAt": 1 })

// Virtual for checking if task is overdue
taskSchema.virtual("isOverdue").get(function () {
  return this.dueDate && this.dueDate < new Date() && this.status !== "completed"
})

// Virtual for days until due
taskSchema.virtual("daysUntilDue").get(function () {
  if (!this.dueDate) return null
  const now = new Date()
  const diffTime = this.dueDate - now
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
})

taskSchema.virtual("displayDescription").get(function () {
  return this.aiEnhancement?.enhancedDescription || this.description
})

taskSchema.virtual("hasAIEnhancement").get(function () {
  return !!this.aiEnhancement
})

// Ensure virtual fields are serialized
taskSchema.set("toJSON", { virtuals: true })
taskSchema.set("toObject", { virtuals: true })

module.exports = mongoose.model("Task", taskSchema)
