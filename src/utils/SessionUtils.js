const { v4: uuidv4 } = require("uuid")
const Session = require("../module/auth/models/Session")

const MAX_SESSIONS_PER_USER = 5

const generateSessionId = () => {
  return uuidv4()
}

const createSession = async (userId, deviceInfo = {}) => {
  const sessionId = generateSessionId()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  // Check current active sessions for this user
  const activeSessions = await Session.find({
    userId,
    isActive: true,
    expiresAt: { $gt: new Date() },
  }).sort({ lastActivity: -1 })

  // If user has reached max sessions, deactivate the oldest ones
  if (activeSessions.length >= MAX_SESSIONS_PER_USER) {
    const sessionsToDeactivate = activeSessions.slice(MAX_SESSIONS_PER_USER - 1)
    const sessionIdsToDeactivate = sessionsToDeactivate.map((s) => s.sessionId)

    await Session.updateMany({ sessionId: { $in: sessionIdsToDeactivate } }, { isActive: false })
  }

  // Create new session
  const session = new Session({
    sessionId,
    userId,
    deviceInfo,
    expiresAt,
  })

  await session.save()
  return sessionId
}

const validateSession = async (sessionId) => {
  const session = await Session.findOne({
    sessionId,
    isActive: true,
    expiresAt: { $gt: new Date() },
  }).populate("userId")

  if (!session) {
    return null
  }

  // Update last activity
  session.lastActivity = new Date()
  await session.save()

  return session
}

const invalidateSession = async (sessionId) => {
  await Session.findOneAndUpdate({ sessionId }, { isActive: false })
}

const invalidateAllUserSessions = async (userId) => {
  await Session.updateMany({ userId, isActive: true }, { isActive: false })
}

const invalidateOtherUserSessions = async (userId, currentSessionId) => {
  await Session.updateMany(
    {
      userId,
      isActive: true,
      sessionId: { $ne: currentSessionId },
    },
    { isActive: false },
  )
}

const getUserActiveSessions = async (userId) => {
  return await Session.find({
    userId,
    isActive: true,
    expiresAt: { $gt: new Date() },
  }).sort({ lastActivity: -1 })
}

module.exports = {
  generateSessionId,
  createSession,
  validateSession,
  invalidateSession,
  invalidateAllUserSessions,
  invalidateOtherUserSessions,
  getUserActiveSessions,
  MAX_SESSIONS_PER_USER,
}
