const mongoose = require("mongoose")

const conversationSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }], // sorted array of two userIds
    lastMessage: {
      from: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      to: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      content: { type: String },
      createdAt: { type: Date },
    },
    lastMessageAt: { type: Date },
  },
  { timestamps: true, collection: "conversations" },
)

conversationSchema.index({ participants: 1 }, { unique: true })

module.exports = mongoose.model("Conversation", conversationSchema)
