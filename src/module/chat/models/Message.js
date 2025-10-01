const mongoose = require("mongoose")

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "messages" },
)

messageSchema.index({ conversationId: 1, createdAt: 1 })

module.exports = mongoose.model("Message", messageSchema)
