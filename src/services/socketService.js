const { Server } = require("socket.io")
const jwt = require("jsonwebtoken")
const config = require("../config/config")
const User = require("../module/user/models/User")

class SocketService {
  constructor() {
    this.io = null
    this.connectedUsers = new Map() // userId -> Set of socketIds
    this.userSockets = new Map() // socketId -> userId
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: [
          process.env.FRONTEND_LOCAL_URL,
          process.env.FRONTEND_HOST_URL,
          process.env.FRONTEND_URL,
          /\.render\.com$/,
          /\.vercel\.app$/,
        ].filter(Boolean),
        credentials: true,
      },
      transports: ["websocket", "polling"],
    })

    this.setupMiddleware()
    this.setupEventHandlers()

    console.log("[v0] Socket.IO server initialized with real-time notifications")
  }

  setupMiddleware() {
    // Authentication middleware for Socket.IO
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace("Bearer ", "")

        if (!token) {
          return next(new Error("Authentication token required"))
        }

        // Verify JWT token
        const decoded = jwt.verify(token, config.jwt.secret)
        const user = await User.findById(decoded.userId).select("-password")

        if (!user) {
          return next(new Error("User not found"))
        }

        socket.userId = user._id.toString()
        socket.user = user
        next()
      } catch (error) {
        console.error("[v0] Socket authentication error:", error.message)
        next(new Error("Authentication failed"))
      }
    })
  }

  setupEventHandlers() {
    this.io.on("connection", (socket) => {
      const userId = socket.userId
      console.log(`[v0] User ${socket.user.firstName} ${socket.user.lastName} connected via Socket.IO`)

      // Track user connection
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set())
      }
      this.connectedUsers.get(userId).add(socket.id)
      this.userSockets.set(socket.id, userId)

      // Join user to their personal room
      socket.join(`user:${userId}`)

      // Join user to their team room if they have a team
      if (socket.user.teamId) {
        socket.join(`team:${socket.user.teamId}`)
      }

      // Send connection confirmation
      socket.emit("connected", {
        message: "Connected to real-time notifications",
        userId: userId,
        timestamp: new Date(),
      })

      // Handle notification acknowledgment
      socket.on("notification:read", async (data) => {
        try {
          const { notificationId } = data
          console.log(`[v0] User ${userId} marked notification ${notificationId} as read`)

          // Broadcast to other user sessions that notification was read
          socket.to(`user:${userId}`).emit("notification:marked_read", {
            notificationId,
            timestamp: new Date(),
          })
        } catch (error) {
          console.error("[v0] Error handling notification read:", error)
        }
      })

      // Handle typing indicators for task comments
      socket.on("task:typing", (data) => {
        const { taskId, isTyping } = data
        socket.to(`task:${taskId}`).emit("task:user_typing", {
          userId,
          userName: `${socket.user.firstName} ${socket.user.lastName}`,
          isTyping,
          timestamp: new Date(),
        })
      })

      // Handle joining task-specific rooms for real-time updates
      socket.on("task:join", (data) => {
        const { taskId } = data
        socket.join(`task:${taskId}`)
        console.log(`[v0] User ${userId} joined task room: ${taskId}`)
      })

      socket.on("task:leave", (data) => {
        const { taskId } = data
        socket.leave(`task:${taskId}`)
        console.log(`[v0] User ${userId} left task room: ${taskId}`)
      })

      // Handle user status updates
      socket.on("user:status", (data) => {
        const { status } = data // online, away, busy, offline
        socket.to(`team:${socket.user.teamId}`).emit("user:status_changed", {
          userId,
          userName: `${socket.user.firstName} ${socket.user.lastName}`,
          status,
          timestamp: new Date(),
        })
      })

      // Handle disconnection
      socket.on("disconnect", (reason) => {
        console.log(`[v0] User ${socket.user.firstName} ${socket.user.lastName} disconnected: ${reason}`)

        // Clean up user tracking
        if (this.connectedUsers.has(userId)) {
          this.connectedUsers.get(userId).delete(socket.id)
          if (this.connectedUsers.get(userId).size === 0) {
            this.connectedUsers.delete(userId)
          }
        }
        this.userSockets.delete(socket.id)

        // Notify team members of disconnection
        if (socket.user.teamId) {
          socket.to(`team:${socket.user.teamId}`).emit("user:status_changed", {
            userId,
            userName: `${socket.user.firstName} ${socket.user.lastName}`,
            status: "offline",
            timestamp: new Date(),
          })
        }
      })
    })
  }

  // Broadcast notification to specific user
  broadcastToUser(userId, event, data) {
    if (this.io && this.connectedUsers.has(userId)) {
      this.io.to(`user:${userId}`).emit(event, {
        ...data,
        timestamp: new Date(),
      })
      console.log(`[v0] Broadcasted ${event} to user ${userId}`)
      return true
    }
    return false
  }

  // Broadcast notification to team
  broadcastToTeam(teamId, event, data, excludeUserId = null) {
    if (this.io) {
      const room = `team:${teamId}`
      if (excludeUserId) {
        // Exclude the user who triggered the event
        this.connectedUsers.forEach((socketIds, userId) => {
          if (userId !== excludeUserId) {
            socketIds.forEach((socketId) => {
              const socket = this.io.sockets.sockets.get(socketId)
              if (socket && socket.rooms.has(room)) {
                socket.emit(event, { ...data, timestamp: new Date() })
              }
            })
          }
        })
      } else {
        this.io.to(room).emit(event, { ...data, timestamp: new Date() })
      }
      console.log(`[v0] Broadcasted ${event} to team ${teamId}`)
      return true
    }
    return false
  }

  // Broadcast to task participants
  broadcastToTask(taskId, event, data, excludeUserId = null) {
    if (this.io) {
      const room = `task:${taskId}`
      if (excludeUserId) {
        this.connectedUsers.forEach((socketIds, userId) => {
          if (userId !== excludeUserId) {
            socketIds.forEach((socketId) => {
              const socket = this.io.sockets.sockets.get(socketId)
              if (socket && socket.rooms.has(room)) {
                socket.emit(event, { ...data, timestamp: new Date() })
              }
            })
          }
        })
      } else {
        this.io.to(room).emit(event, { ...data, timestamp: new Date() })
      }
      console.log(`[v0] Broadcasted ${event} to task ${taskId}`)
      return true
    }
    return false
  }

  // Get online users count
  getOnlineUsersCount() {
    return this.connectedUsers.size
  }

  // Get online users in a team
  getTeamOnlineUsers(teamId) {
    const onlineUsers = []
    this.connectedUsers.forEach((socketIds, userId) => {
      socketIds.forEach((socketId) => {
        const socket = this.io.sockets.sockets.get(socketId)
        if (socket && socket.rooms.has(`team:${teamId}`)) {
          onlineUsers.push({
            userId,
            userName: `${socket.user.firstName} ${socket.user.lastName}`,
            connectedAt: socket.handshake.time,
          })
        }
      })
    })
    return onlineUsers
  }

  // Check if user is online
  isUserOnline(userId) {
    return this.connectedUsers.has(userId)
  }

  // Send real-time notification
  sendRealTimeNotification(notification) {
    const recipientId = notification.recipient.toString()

    // Broadcast to user
    const sent = this.broadcastToUser(recipientId, "notification:new", {
      notification: {
        _id: notification._id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        priority: notification.priority,
        showAsPopup: notification.showAsPopup,
        metadata: notification.metadata,
        createdAt: notification.createdAt,
      },
    })

    // Also broadcast unread count update
    if (sent) {
      this.broadcastToUser(recipientId, "notification:count_updated", {
        action: "increment",
      })
    }

    return sent
  }
}

// Export singleton instance
module.exports = new SocketService()
