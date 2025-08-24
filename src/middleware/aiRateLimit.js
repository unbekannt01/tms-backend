const rateLimit = require("express-rate-limit")

const aiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each user to 20 AI requests per windowMs
  message: {
    error: "Too many AI requests from this user, please try again later.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID for authenticated requests
    return req.user ? req.user._id.toString() : req.ip
  },
  skip: (req) => {
    // Skip rate limiting for admin users
    return req.user && req.user.roleId.name === "admin"
  },
})

module.exports = aiRateLimit
