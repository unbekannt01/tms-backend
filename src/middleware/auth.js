const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const redis = require("../redisClient");
const config = require("../config/config");
const User = require("../module/user/models/User");

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);

    // Check session (JTI) in Redis
    const jtiKey = `jti:${decoded.jti}`;
    const exists = await redis.exists(jtiKey);
    if (!exists) {
      return res.status(401).json({ message: "Session is invalid or expired" });
    }

    // Accept userId from any common key
    const userId = decoded.userId || decoded._id || decoded.id;

    if (!userId) {
      return res.status(401).json({ message: "Token missing user identifier" });
    }

    // Validate ObjectId before hitting DB
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    // Load latest user (with role)
    const user = await User.findById(userId).populate("roleId");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Attach to req
    req.userId = userId;
    req.jti = decoded.jti;
    req.user = user;

    next();
  } catch (err) {
    console.error("Token verification failed:", err);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

module.exports = authMiddleware;
