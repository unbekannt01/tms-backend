const mongoose = require("mongoose")

const emailTokenSchema = new mongoose.Schema(
  {
    verificationToken: {
      type: String,
      required: true,
      unique: true,
    },
    tokenExpiration: {
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
    collection: "emailToken",
  },
)

// Auto-delete expired tokens
emailTokenSchema.index({ tokenExpiration: 1 }, { expireAfterSeconds: 0 })

module.exports = mongoose.model("EmailToken", emailTokenSchema)
