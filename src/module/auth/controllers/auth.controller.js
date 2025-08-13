const User = require("../../user/models/User")
const Role = require("../../rbac/models/Role")
const bcrypt = require("bcrypt")
const { createSession, invalidateSession } = require("../../../utils/sessionUtils")
const { parseDeviceInfo } = require("../../../utils/deviceUtils")

const loginUser = async (req, res) => {
  try {
    const { emailOrUserName, password } = req.body
    const identifier = emailOrUserName

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

    // Parse device information
    const deviceInfo = parseDeviceInfo(req.headers["user-agent"], req.ip || req.connection.remoteAddress)

    // Create new session (this will automatically handle session limit)
    const sessionId = await createSession(user._id, deviceInfo)

    // Update user status
    user.isLoggedIn = true
    user.status = "active"
    await user.save()

    const { password: _password, ...userResponse } = user.toObject()

    res.status(200).json({
      message: "Login successful!",
      user: userResponse,
      sessionId,
    })
  } catch (err) {
    res.status(500).json({ message: "Internal server error" })
  }
}

const logOutUser = async (req, res) => {
  try {
    const sessionId = req.sessionId
    const userId = req.userId

    // Invalidate current session
    if (sessionId) {
      await invalidateSession(sessionId)
    }

    // Update user status if no other active sessions
    if (userId) {
      const user = await User.findById(userId)
      if (user) {
        // Check if user has other active sessions
        const { getUserActiveSessions } = require("../../../utils/sessionUtils")
        const activeSessions = await getUserActiveSessions(userId)

        if (activeSessions.length === 0) {
          user.isLoggedIn = false
          user.status = "inactive"
          await user.save()
        }
      }
    }

    res.json({ message: "User logged out successfully" })
  } catch (err) {
    res.status(500).json({ message: "Internal server error" })
  }
}

const getCurrentUser = async (req, res) => {
  try {
    let userData

    if (typeof req.user?.toObject === "function") {
      userData = req.user.toObject()
    } else {
      userData = { ...req.user }
    }

    delete userData.password

    res.status(200).json({
      message: "Session valid",
      user: userData,
      sessionId: req.sessionId,
    })
  } catch (err) {
    res.status(500).json({ message: "Internal server error" })
  }
}

module.exports = {
  loginUser,
  logOutUser,
  getCurrentUser,
}
