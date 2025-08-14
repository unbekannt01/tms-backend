const { validateSession } = require("../utils/sessionUtils")
const { verifyAccessToken } = require("../utils/jwtUtils")

const sessionAuthMiddleware = async (req, res, next) => {
  const sessionId = req.headers["x-session-id"]
  const authHeader = req.headers["authorization"]

  let accessToken = null
  if (authHeader && authHeader.startsWith("Bearer ")) {
    accessToken = authHeader.substring(7)
  }

  if (!sessionId) {
    return res.status(401).json({
      message: "No session ID provided",
      code: "NO_SESSION",
    })
  }

  if (accessToken) {
    const tokenPayload = verifyAccessToken(accessToken)
    if (!tokenPayload) {
      return res.status(401).json({
        message: "Invalid or expired access token",
        code: "TOKEN_INVALID",
      })
    }

    if (tokenPayload.sessionId !== sessionId) {
      return res.status(401).json({
        message: "Token session mismatch",
        code: "SESSION_MISMATCH",
      })
    }
  }

  try {
    const session = await validateSession(sessionId)

    if (!session) {
      return res.status(401).json({
        message: "Invalid or expired session",
        code: "SESSION_INVALID",
      })
    }

    if (accessToken) {
      const tokenPayload = verifyAccessToken(accessToken)
      if (tokenPayload.userId !== session.userId._id.toString()) {
        return res.status(401).json({
          message: "Token user mismatch",
          code: "USER_MISMATCH",
        })
      }
    }

    // Attach session and user to request
    req.sessionId = sessionId
    req.session = session
    req.user = session.userId
    req.userId = session.userId._id
    req.accessToken = accessToken

    next()
  } catch (err) {
    return res.status(500).json({
      message: "Session validation error",
      code: "SESSION_ERROR",
    })
  }
}

module.exports = sessionAuthMiddleware
