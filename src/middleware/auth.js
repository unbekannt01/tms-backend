const jwt = require("jsonwebtoken")
const redis = require("../redisClient")
const config = require("../config/config")
const User = require("../module/user/models/User")

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(401).json({ message: "No token provided" })
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret)
    const jtiKey = `jti:${decoded.jti}`

    const exists = await redis.exists(jtiKey)
    if (!exists) {
      return res.status(401).json({ message: "Session is invalid or expired" })
    }

    // Get user data and populate role
    const user = await User.findById(decoded.userId).populate("roleId")
    if (!user) {
      return res.status(401).json({ message: "User not found" })
    }

    req.userId = decoded.userId
    req.jti = decoded.jti
    req.user = user
    next()
  } catch (err) {
    console.error("Token verification failed:", err)
    res.status(403).json({ message: "Invalid or expired token" })
  }
}

module.exports = authMiddleware
