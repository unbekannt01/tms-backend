const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true, // creates the index already
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    accessToken: String,
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
  }
);

// TTL index
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index
sessionSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model("Session", sessionSchema);
