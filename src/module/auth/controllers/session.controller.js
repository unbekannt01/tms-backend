const {
  getUserActiveSessions,
  invalidateSession,
  MAX_SESSIONS_PER_USER,
  deleteAllUserSessions,
  cleanupExpiredSessions,
  getAllActiveSessions,
} = require("../../../utils/sessionUtils");
const Session = require("../models/Session");

const getActiveSessions = async (req, res) => {
  try {
    const sessions = await getUserActiveSessions(req.userId);

    const sessionData = sessions.map((session) => ({
      sessionId: session.sessionId,
      deviceInfo: session.deviceInfo,
      lastActivity: session.lastActivity,
      createdAt: session.createdAt,
      isCurrent: session.sessionId === req.sessionId,
    }));

    res.json({
      message: "Active sessions retrieved successfully",
      sessions: sessionData,
      maxSessions: MAX_SESSIONS_PER_USER,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const getAllActiveSessionsController = async (req, res) => {
  try {
    const sessions = await getAllActiveSessions();

    const sessionData = sessions.map((session) => ({
      sessionId: session.sessionId,
      userId: session.userId?._id,
      userEmail: session.userId?.email,
      deviceInfo: session.deviceInfo,
      lastActivity: session.lastActivity,
      createdAt: session.createdAt,
      isCurrent: session.sessionId === req.sessionId,
    }));

    res.json({
      message: "All active sessions retrieved successfully",
      sessions: sessionData,
      maxSessions: MAX_SESSIONS_PER_USER, // optional, might not apply for admin
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const terminateSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (sessionId === req.sessionId) {
      return res.status(400).json({
        message: "Cannot terminate current session. Use logout instead.",
      });
    }

    await invalidateSession(sessionId);

    res.json({ message: "Session terminated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const checkSession = async (req, res) => {
  try {
    res.json({
      valid: true,
      sessionId: req.sessionId,
      user: {
        id: req.user._id,
        email: req.user.email,
        userName: req.user.userName,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const adminLogoutAllSessions = async (_req, res) => {
  try {
    await cleanupExpiredSessions();
    const result = await Session.deleteMany({});
    return res.json({
      message: "All sessions terminated successfully",
      deletedCount: result.deletedCount || 0,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

const adminLogoutUserSessions = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ message: "userId is required" });

    await deleteAllUserSessions(userId);
    return res.json({
      message: "User sessions terminated successfully",
      userId,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  getActiveSessions,
  terminateSession,
  checkSession,
  getAllActiveSessionsController,
  adminLogoutAllSessions,
  adminLogoutUserSessions,
};
