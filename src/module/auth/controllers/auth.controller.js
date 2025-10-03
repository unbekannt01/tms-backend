const User = require("../../user/models/User");
const Role = require("../../rbac/models/Role");
const bcrypt = require("bcrypt");
const SystemSetting = require("../../system/models/SystemSetting"); // block non-admin login during maintenance mode
const {
  createSession,
  invalidateSession,
  getUserActiveSessions,
} = require("../../../utils/sessionUtils");
const { parseDeviceInfo } = require("../../../utils/deviceUtils");
const {
  generateAccessToken,
  verifyAccessToken,
} = require("../../../utils/jwtUtils");
const crypto = require("crypto");

const loginUser = async (req, res) => {
  try {
    const { emailOrUserName, password } = req.body;
    const identifier = emailOrUserName;

    // Find user by email OR username and populate role
    const user = await User.findOne({
      $or: [{ email: identifier }, { userName: identifier }],
    }).populate("roleId");

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: "User not verified yet",
        email: user.email,
        needsVerification: true,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Maintenance check (block non-admin)
    try {
      const settings = await SystemSetting.getGlobal();
      const maintenanceActive = !!settings.maintenanceMode;
      if (maintenanceActive && user?.roleId?.name !== "admin") {
        return res.status(423).json({
          message:
            settings.maintenanceMessage ||
            "The system is under maintenance. Please try again later.",
          code: "MAINTENANCE_MODE",
        });
      }
    } catch (e) {
      // If maintenance lookup fails, default to proceed (fail-open)
    }

    // Assign default role if user doesn't have one
    if (!user.roleId) {
      const defaultRole = await Role.findOne({ name: "user" });
      if (defaultRole) {
        user.roleId = defaultRole._id;
        await user.save();
        await user.populate("roleId");
      }
    }

    // Parse device information
    const deviceInfo = parseDeviceInfo(
      req.headers["user-agent"],
      req.ip || req.connection.remoteAddress
    );

    // Create new session (this will automatically handle session limit)
    const sessionId = await createSession(user._id, deviceInfo);

    const accessToken = generateAccessToken(user._id, sessionId);

    // Update user status
    user.isLoggedIn = true;
    user.status = "active";
    await user.save();

    const { password: _password, ...userResponse } = user.toObject();

    // CHECK FOR SECURITY SETUP MIGRATION
    const needsSecuritySetup =
      !user.isSecuritySetupComplete &&
      (!user.securityQuestions ||
        user.securityQuestions.length === 0 ||
        !user.backupCodes ||
        user.backupCodes.length === 0);

    res.status(200).json({
      message: "Login successful!",
      user: userResponse,
      sessionId,
      accessToken,
      // NEW FIELD FOR FRONTEND
      needsSecuritySetup,
    });
  } catch (err) {
    console.error("[v0] Login error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const logOutUser = async (req, res) => {
  try {
    const sessionId = req.sessionId;
    const userId = req.userId;

    // Check if Authorization header with JWT token is provided
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);

      try {
        const decoded = verifyAccessToken(token);

        // Verify that JWT token matches the current session
        if (decoded.sessionId !== sessionId) {
          return res
            .status(401)
            .json({ message: "JWT token does not match current session" });
        }

        // Verify that JWT user matches session user
        if (decoded.userId !== userId.toString()) {
          return res
            .status(401)
            .json({ message: "JWT token user does not match session user" });
        }

        console.log("JWT token validated successfully during logout");
      } catch (jwtError) {
        return res
          .status(401)
          .json({ message: "Invalid JWT token provided for logout" });
      }
    }

    // Invalidate current session
    if (sessionId) {
      await invalidateSession(sessionId);
    }

    // Update user status if no other active sessions
    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        // Check if user has other active sessions
        const activeSessions = await getUserActiveSessions(userId);

        if (activeSessions.length === 0) {
          user.isLoggedIn = false;
          user.status = "inactive";
          await user.save();
        }
      }
    }

    res.json({ message: "User logged out successfully" });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    let userData;

    if (typeof req.user?.toObject === "function") {
      userData = req.user.toObject();
    } else {
      userData = { ...req.user };
    }

    delete userData.password;

    // CHECK FOR SECURITY SETUP MIGRATION
    const needsSecuritySetup =
      !userData.isSecuritySetupComplete &&
      (!userData.securityQuestions ||
        userData.securityQuestions.length === 0 ||
        !userData.backupCodes ||
        userData.backupCodes.length === 0);

    res.status(200).json({
      message: "Session valid",
      user: userData,
      sessionId: req.sessionId,
      accessToken: req.accessToken,
      needsSecuritySetup,
    });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// UPDATED setSecurityQuestions function
const setSecurityQuestions = async (req, res) => {
  try {
    const userId = req.userId || req.body.userId; // Support both session and body userId
    const { securityQuestions: questions } = req.body;

    // Validate inputs
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    if (!questions) {
      return res.status(400).json({ message: "Questions are required" });
    }

    if (!Array.isArray(questions)) {
      return res.status(400).json({ message: "Questions must be an array" });
    }

    if (questions.length < 2) {
      return res
        .status(400)
        .json({ message: "At least 2 security questions are required" });
    }

    // Validate each question
    for (const q of questions) {
      if (!q.question || !q.answer) {
        return res.status(400).json({
          message: "Each question must have both question and answer",
        });
      }
    }

    // Hash the questions
    const hashedQuestions = await Promise.all(
      questions.map(async (q) => {
        return {
          question: q.question,
          answerHash: await bcrypt.hash(q.answer.toLowerCase().trim(), 10),
        };
      })
    );

    // Update the user
    const user = await User.findByIdAndUpdate(
      userId,
      {
        securityQuestions: hashedQuestions,
        isSecuritySetupComplete: true, // MARK AS COMPLETE
        securitySetupPromptShown: true,
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log("Security questions set successfully for user:", userId);

    res.status(200).json({
      message: "Security questions set successfully",
      success: true,
    });
  } catch (error) {
    console.error("Error setting security questions:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getSecurityQuestions = async (req, res) => {
  try {
    const { email } = req.query; // or req.body if you prefer

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.securityQuestions || user.securityQuestions.length === 0) {
      return res
        .status(404)
        .json({ message: "No security questions set for this user" });
    }

    // Return only the questions, never the hashed answers
    const questions = user.securityQuestions.map((q) => ({
      question: q.question,
    }));

    res.status(200).json({
      message: "Security questions retrieved successfully",
      questions,
    });
  } catch (error) {
    console.error("Error fetching security questions:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const verifySecurityAnswers = async (email, answers) => {
  try {
    // Validate input without throwing
    if (!email || !Array.isArray(answers) || answers.length === 0) {
      return { success: false, message: "Email and answers are required" };
    }

    const user = await User.findOne({ email });
    if (!user) {
      return { success: false, message: "User not found" };
    }

    if (!user.securityQuestions?.length) {
      return {
        success: false,
        message: "Security questions not set for this user",
      };
    }

    const questionMap = new Map();
    user.securityQuestions.forEach((q) =>
      questionMap.set(q.question, q.answerHash)
    );

    for (const { question, answer } of answers) {
      const hash = questionMap.get(question);
      if (!hash) {
        return { success: false, message: `Question "${question}" not found` };
      }

      const match = await bcrypt.compare(answer, hash);
      if (!match) {
        return {
          success: false,
          message: `Answer for "${question}" is incorrect`,
        };
      }
    }

    return { success: true, message: "All answers verified successfully" };
  } catch (err) {
    console.error("Error verifying security answers:", err);
    return { success: false, message: "Internal server error" };
  }
};

// NEW FUNCTION: Complete Security Setup with Backup Codes
const completeSecuritySetup = async (req, res) => {
  try {
    const userId = req.userId; // From session middleware
    const { securityQuestions: questions } = req.body;

    // Validate inputs
    if (!questions || !Array.isArray(questions) || questions.length < 2) {
      return res.status(400).json({
        message: "At least 2 security questions are required",
      });
    }

    // Validate each question
    for (const q of questions) {
      if (!q.question || !q.answer) {
        return res.status(400).json({
          message: "Each question must have both question and answer",
        });
      }
    }

    // Hash the questions
    const hashedQuestions = await Promise.all(
      questions.map(async (q) => {
        return {
          question: q.question,
          answerHash: await bcrypt.hash(q.answer.toLowerCase().trim(), 10),
        };
      })
    );

    // Generate backup codes directly (no service needed)
    const backupCodes = [];
    for (let i = 0; i < 8; i++) {
      const code = crypto.randomBytes(4).toString("hex").toUpperCase();
      backupCodes.push(code);
    }

    // Update the user with security questions and backup codes
    const user = await User.findByIdAndUpdate(
      userId,
      {
        securityQuestions: hashedQuestions,
        backupCodes: backupCodes.map((code) => ({ code })), // Match your schema format
        isSecuritySetupComplete: true,
        securitySetupPromptShown: true,
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log(
      `Security setup completed for user: ${userId}, generated ${backupCodes.length} backup codes`
    );

    res.status(200).json({
      message: "Security setup completed successfully",
      success: true,
      backupCodes, // Return plain codes for user to save
    });
  } catch (error) {
    console.error("Error completing security setup:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  loginUser,
  logOutUser,
  getCurrentUser,
  setSecurityQuestions,
  verifySecurityAnswers,
  getSecurityQuestions,
  completeSecuritySetup, // NEW EXPORT
};
