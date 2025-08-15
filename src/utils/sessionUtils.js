const { v4: uuidv4 } = require("uuid");
const Session = require("../module/auth/models/Session");
const { generateAccessToken } = require("./jwtUtils");

const MAX_SESSIONS_PER_USER = 2;

const generateSessionId = () => {
  return uuidv4();
};

const createSession = async (userId, deviceInfo = {}) => {
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000);

  // Check current active sessions for this user
  const activeSessions = await Session.find({
    userId,
    isActive: true,
    expiresAt: { $gt: new Date() },
  }).sort({ lastActivity: -1 });

  if (activeSessions.length >= MAX_SESSIONS_PER_USER) {
    const sessionsToDelete = activeSessions.slice(MAX_SESSIONS_PER_USER - 1);
    const sessionIdsToDelete = sessionsToDelete.map((s) => s.sessionId);

    await Session.deleteMany({ sessionId: { $in: sessionIdsToDelete } });
  }

  await Session.deleteMany({ userId, isActive: false });

  // Generate JWT access token
  const accessToken = generateAccessToken(userId, sessionId);

  // Create new session with access token
  const session = new Session({
    sessionId,
    userId,
    accessToken,
    deviceInfo,
    expiresAt,
  });

  await session.save();
  return sessionId;
};

const validateSession = async (sessionId) => {
  const session = await Session.findOne({
    sessionId,
    isActive: true,
    expiresAt: { $gt: new Date() },
  }).populate({
    path: "userId",
    populate: {
      path: "roleId",
      model: "Role",
    },
  });

  if (!session) {
    return null;
  }

  // Update last activity
  session.lastActivity = new Date();
  await session.save();

  return session;
};

const invalidateSession = async (sessionId) => {
  await Session.findOneAndDelete({ sessionId });
};

const invalidateAllUserSessions = async (userId) => {
  await Session.deleteMany({ userId, isActive: true });
};

const invalidateOtherUserSessions = async (userId, currentSessionId) => {
  await Session.deleteMany({
    userId,
    isActive: true,
    sessionId: { $ne: currentSessionId },
  });
};

const getUserActiveSessions = async (userId) => {
  return await Session.find({
    userId,
    isActive: true,
    expiresAt: { $gt: new Date() },
  }).sort({ lastActivity: -1 });
};

const deleteSession = async (sessionId) => {
  await Session.findOneAndDelete({ sessionId });
};

const deleteAllUserSessions = async (userId) => {
  await Session.deleteMany({ userId });
};

const cleanupExpiredSessions = async () => {
  await Session.deleteMany({
    $or: [{ expiresAt: { $lt: new Date() } }, { isActive: false }],
  });
};

async function getAllActiveSessions() {
  await cleanupExpiredSessions();
  return await Session.find();
}

module.exports = {
  generateSessionId,
  createSession,
  validateSession,
  invalidateSession,
  invalidateAllUserSessions,
  invalidateOtherUserSessions,
  getUserActiveSessions,
  deleteSession,
  deleteAllUserSessions,
  cleanupExpiredSessions,
  MAX_SESSIONS_PER_USER,
  getAllActiveSessions,
};
