const mongoose = require("mongoose")

const sessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    accessToken: {
      type: String,
      required: false,
    },
    deviceInfo: {
      userAgent: String,
      ip: String,
      browser: String,
      os: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "sessions",
  },
)

// Auto-delete expired sessions
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// Index for better query performance
sessionSchema.index({ userId: 1, isActive: 1 })
sessionSchema.index({ sessionId: 1 })

module.exports = mongoose.model("Session", sessionSchema)
