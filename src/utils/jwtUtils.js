const jwt = require("jsonwebtoken")

const generateAccessToken = (userId, sessionId) => {
  const payload = {
    userId: userId.toString(),
    sessionId,
  }

  return jwt.sign(payload, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
  })
}

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET_KEY)
  } catch (error) {
    return null
  }
}

module.exports = {
  generateAccessToken,
  verifyAccessToken,
}
