const User = require("../../user/models/User")
const Role = require("../../rbac/models/Role")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const { v4: uuidv4 } = require("uuid")
const redis = require("../../../redisClient")
const config = require("../../../config/config")

const loginUser = async (req, res) => {
  try {
    const { emailOrUserName, password } = req.body
    const identifier = emailOrUserName.toLowerCase()

    // Find user by email OR username and populate role
    const user = await User.findOne({
      $or: [{ email: identifier }, { userName: identifier }],
    }).populate("roleId")

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: "User not verified yet" })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    // Assign default role if user doesn't have one
    if (!user.roleId) {
      const defaultRole = await Role.findOne({ name: "user" })
      if (defaultRole) {
        user.roleId = defaultRole._id
        await user.save()
        await user.populate("roleId")
      }
    }

    // Create JTI for JWT
    const jti = uuidv4()
    const token = jwt.sign({ userId: user._id, jti }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    })

    // Store JTI in Redis for token validation / blacklisting
    // EX 3600 → expire in 1 hour
    await redis.set(`jti:${jti}`, user._id.toString(), "EX", 3600)

    // Update user status
    user.isLoggedIn = true
    user.status = "active"
    await user.save()

    const { password: _password, ...userResponse } = user.toObject()

    res.status(200).json({
      message: "Login successful!",
      user: userResponse,
      token,
    })
  } catch (err) {
    console.error("Login error:", err)
    res.status(500).json({ message: "Internal server error" })
  }
}

const logOutUser = async (req, res) => {
  try {
    const jti = req.jti
    const userId = req.userId

    if (jti) {
      await redis.del(`jti:${jti}`)
    }

    if (userId) {
      const user = await User.findById(userId)
      if (user) {
        user.isLoggedIn = false
        user.status = "inactive"
        await user.save()
      }
    }

    res.json({ message: "User logged out successfully" })
  } catch (err) {
    console.error("Logout error:", err)
    res.status(500).json({ message: "Internal server error" })
  }
}

module.exports = {
  loginUser,
  logOutUser,
}
