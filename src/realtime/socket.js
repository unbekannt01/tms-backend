const { Server } = require("socket.io")
const { verifyAccessToken } = require("../utils/jwtUtils")
const Conversation = require("../module/chat/models/Conversation")
const Message = require("../module/chat/models/Message")

let io
const onlineUsers = new Map() // userId -> Set<socketId>

function addOnline(userId, socketId) {
  const uid = String(userId)
  if (!onlineUsers.has(uid)) onlineUsers.set(uid, new Set())
  onlineUsers.get(uid).add(socketId)
}

function removeOnline(userId, socketId) {
  const uid = String(userId)
  if (!onlineUsers.has(uid)) return
  const set = onlineUsers.get(uid)
  set.delete(socketId)
  if (set.size === 0) onlineUsers.delete(uid)
}

function getUserRooms(userId) {
  return [`user:${userId}`]
}

function initSocket(server, options = {}) {
  io = new Server(server, options)

  // Auth handshake using JWT sent via auth.accessToken
  io.use((socket, next) => {
    const token = socket.handshake?.auth?.accessToken
    if (!token) return next(new Error("Unauthorized: missing token"))
    const payload = verifyAccessToken(token)
    if (!payload?.userId) return next(new Error("Unauthorized: invalid token"))
    socket.userId = payload.userId
    socket.sessionId = payload.sessionId
    next()
  })

  io.on("connection", (socket) => {
    const userId = socket.userId
    addOnline(userId, socket.id)
    // Join personal room
    getUserRooms(userId).forEach((room) => socket.join(room))

    // Bootstrap presence: send who is online right now to this socket
    try {
      const snapshot = Array.from(onlineUsers.keys()).map(String)
      socket.emit("presence:snapshot", { users: snapshot })
    } catch (e) {
      console.error("[v0] presence snapshot error", e)
    }

    // Broadcast presence to everyone (so others can mark user online)
    io.emit("presence:update", { userId: String(userId), online: true })

    // Pre-join all conversations this user participates in so they receive messages immediately
    ;(async () => {
      try {
        const convos = await Conversation.find({ participants: userId }, { _id: 1 }).lean()
        convos.forEach((c) => socket.join(`conversation:${c._id}`))
      } catch (e) {
        console.error("[v0] pre-join convos error", e)
      }
    })()

    socket.on("chat:join", async ({ conversationId }) => {
      if (!conversationId) return
      // basic authorization: ensure user is participant
      const convo = await Conversation.findOne({
        _id: conversationId,
        participants: userId,
      }).lean()
      if (!convo) return
      socket.join(`conversation:${conversationId}`)
    })

    socket.on("chat:typing", ({ conversationId, isTyping }) => {
      if (!conversationId) return
      socket.to(`conversation:${conversationId}`).emit("chat:typing", {
        conversationId,
        userId,
        isTyping: !!isTyping,
      })
    })

    socket.on("chat:message", async ({ conversationId, to, content }) => {
      try {
        if (!content || (!conversationId && !to)) return

        let convo = null
        let createdNew = false

        if (conversationId) {
          convo = await Conversation.findOne({
            _id: conversationId,
            participants: userId,
          })
        } else if (to) {
          const participants = [String(userId), String(to)].sort()
          const found = await Conversation.findOne({ participants })
          if (found) {
            convo = found
          } else {
            convo = await Conversation.create({ participants })
            createdNew = true
          }
        }

        if (!convo) return

        const msg = await Message.create({
          conversationId: convo._id,
          from: userId,
          to: to || convo.participants.find((p) => String(p) !== String(userId)),
          content,
        })

        // update lastMessage shortcuts
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

        // emit to conversation room and recipient personal room
        io.to(`conversation:${convo._id}`).emit("chat:message", payload)
        if (createdNew) {
          io.to(getUserRooms(String(payload.to))).emit("chat:message", payload)
        }
      } catch (err) {
        console.error("[v0] chat:message error", err)
      }
    })

    socket.on("disconnect", () => {
      removeOnline(userId, socket.id)
      if (!onlineUsers.has(String(userId))) {
        io.emit("presence:update", {
          userId: String(userId),
          online: false,
        })
      }
    })
  })
}

function getIO() {
  return io
}

module.exports = { initSocket, getIO }
