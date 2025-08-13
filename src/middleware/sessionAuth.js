const { validateSession } = require("../utils/sessionUtils")

const sessionAuthMiddleware = async (req, res, next) => {
  const sessionId = req.headers["x-session-id"]

  if (!sessionId) {
    return res.status(401).json({
      message: "No session ID provided",
      code: "NO_SESSION",
    })
  }

  try {
    const session = await validateSession(sessionId)

    if (!session) {
      return res.status(401).json({
        message: "Invalid or expired session",
        code: "SESSION_INVALID",
      })
    }

    // Attach session and user to request
    req.sessionId = sessionId
    req.session = session
    req.user = session.userId
    req.userId = session.userId._id

    next()
  } catch (err) {
    return res.status(500).json({
      message: "Session validation error",
      code: "SESSION_ERROR",
    })
  }
}

module.exports = sessionAuthMiddleware
