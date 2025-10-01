const Conversation = require("../models/Conversation")
const Message = require("../models/Message")
const mongoose = require("mongoose")
const { getIO } = require("../../../realtime/socket")

const ensureConversation = async (userId, otherUserId) => {
  const ids = [userId, otherUserId].map((x) => new mongoose.Types.ObjectId(x)).sort()
  let convo = await Conversation.findOne({ participants: ids })
  if (!convo) {
    convo = await Conversation.create({ participants: ids })
  }
  return convo
}

const getOrCreateConversation = async (req, res) => {
  try {
    const userId = req.userId
    const { targetUserId } = req.body
    if (!targetUserId) return res.status(400).json({ message: "targetUserId required" })

    const convo = await ensureConversation(userId, targetUserId)
    await convo.populate("participants", "firstName lastName userName avatar roleId")

    res.json(convo)
  } catch (err) {
    console.error("getOrCreateConversation error:", err)
    res.status(500).json({ message: "Internal server error" })
  }
}

const listConversations = async (req, res) => {
  try {
    const userId = req.userId
    const convos = await Conversation.find({ participants: userId })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .populate("participants", "firstName lastName userName avatar roleId")
      .lean()

    res.json(convos)
  } catch (err) {
    console.error("listConversations error:", err)
    res.status(500).json({ message: "Internal server error" })
  }
}

const getMessages = async (req, res) => {
  try {
    const userId = req.userId
    const { id } = req.params
    const convo = await Conversation.findOne({ _id: id, participants: userId }).lean()
    if (!convo) return res.status(404).json({ message: "Conversation not found" })

    const limit = Math.min(Number.parseInt(req.query.limit) || 50, 200)
    const before = req.query.before ? new Date(req.query.before) : null

    const filter = { conversationId: id }
    if (before) filter.createdAt = { $lt: before }

    const messages = await Message.find(filter).sort({ createdAt: -1 }).limit(limit).lean()

    res.json(messages.reverse())
  } catch (err) {
    console.error("getMessages error:", err)
    res.status(500).json({ message: "Internal server error" })
  }
}

const sendMessage = async (req, res) => {
  try {
    const userId = req.userId
    const { conversationId, to, content } = req.body

    let convo
    if (conversationId) {
      convo = await Conversation.findOne({
        _id: conversationId,
        participants: userId,
      })
    } else if (to) {
      convo = await ensureConversation(userId, to)
    } else {
      return res.status(400).json({ message: "conversationId or to required" })
    }

    const recipient = to || convo.participants.find((p) => String(p) !== String(userId))

    const msg = await Message.create({
      conversationId: convo._id,
      from: userId,
      to: recipient,
      content,
    })

    convo.lastMessageAt = new Date()
    convo.lastMessage = {
      from: msg.from,
      to: msg.to,
      content: msg.content,
      createdAt: msg.createdAt,
    }
    await convo.save()

    const payload = {
      _id: msg._id,
      conversationId: String(convo._id),
      from: msg.from,
      to: msg.to,
      content: msg.content,
      createdAt: msg.createdAt,
      readAt: msg.readAt || null,
    }

    const io = getIO()
    if (io) {
      io.to(`conversation:${convo._id}`).emit("chat:message", payload)
      io.to(`user:${String(payload.to)}`).emit("chat:message", payload)
    }

    res.status(201).json(payload)
  } catch (err) {
    console.error("sendMessage error:", err)
    res.status(500).json({ message: "Internal server error" })
  }
}

const markRead = async (req, res) => {
  try {
    const userId = req.userId
    const { conversationId } = req.body
    if (!conversationId) return res.status(400).json({ message: "conversationId required" })

    await Message.updateMany({ conversationId, to: userId, readAt: null }, { $set: { readAt: new Date() } })

    res.json({ ok: true })
  } catch (err) {
    console.error("markRead error:", err)
    res.status(500).json({ message: "Internal server error" })
  }
}

const deleteConversation = async (req, res) => {
  try {
    const userId = req.userId
    const { id } = req.params

    const convo = await Conversation.findOne({ _id: id, participants: userId })
    if (!convo) return res.status(404).json({ message: "Conversation not found" })

    // Delete all messages for this conversation
    await Message.deleteMany({ conversationId: id })

    // Keep track of participants to notify via sockets
    const participantIds = (convo.participants || []).map((p) => String(p))

    // Delete conversation document
    await convo.deleteOne()

    // Notify clients via socket
    const io = getIO()
    if (io) {
      const payload = { conversationId: String(id) }
      io.to(`conversation:${id}`).emit("chat:deleted", payload)
      // Also notify each participant's personal room so they update lists even if not joined to room
      participantIds.forEach((uid) => {
        io.to(`user:${uid}`).emit("chat:deleted", payload)
      })
    }

    return res.json({ ok: true })
  } catch (err) {
    console.error("deleteConversation error:", err)
    return res.status(500).json({ message: "Internal server error" })
  }
}

module.exports = {
  getOrCreateConversation,
  listConversations,
  getMessages,
  sendMessage,
  markRead,
  deleteConversation,
}
