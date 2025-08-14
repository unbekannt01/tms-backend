const jwt = require("jsonwebtoken")

const generateAccessToken = (userId, sessionId) => {
  const payload = {
    userId: userId.toString(),
    sessionId,
    type: "access_token",
  }

  return jwt.sign(payload, process.env.JWT_SECRET_KEY_FOR_TOKEN, {
    expiresIn: process.env.JWT_EXPIRES_IN_FOR_TOKEN || "1h",
  })
}

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET_KEY_FOR_TOKEN)
  } catch (error) {
    return null
  }
}

module.exports = {
  generateAccessToken,
  verifyAccessToken,
}
