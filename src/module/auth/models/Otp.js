const mongoose = require("mongoose")

const otpSchema = new mongoose.Schema(
  {
    otp: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    otpExpiration: {
      type: Date,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "otp",
  },
)

// Auto-delete expired OTPs
otpSchema.index({ otpExpiration: 1 }, { expireAfterSeconds: 0 })

module.exports = mongoose.model("Otp", otpSchema)
