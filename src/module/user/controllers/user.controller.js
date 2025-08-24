const User = require("../models/User");
const Role = require("../../rbac/models/Role");
const EmailToken = require("../../auth/models/EmailToken");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");
const config = require("../../../config/config");
const { EmailServiceForToken } = require("../services/emailTokenService");
const emailService = require("../../../services/emailService");

const emailServiceForToken = new EmailServiceForToken();

const createUser = async (req, res) => {
  try {
    const { firstName, lastName, userName, email, password, age } = req.body;
    const currentUser = req.user;

    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { userName: userName.toLowerCase() },
      ],
    });

    if (existingUser) {
      return res
        .status(409)
        .json({ message: "User with this email or username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = await Role.findOne({ name: "user" });

    const user = new User({
      firstName,
      lastName,
      userName: userName.toLowerCase(),
      email: email.toLowerCase(),
      password: hashedPassword,
      age,
      isVerified: true,
      roleId: userRole ? userRole._id : null,
    });

    const savedUser = await user.save();
    await savedUser.populate("roleId");

    try {
      const welcomeEmailResult = await emailService.sendWelcomeEmail(
        savedUser,
        currentUser
      );
      if (welcomeEmailResult.success) {
        console.log(`[v0] Welcome email sent to new user: ${savedUser.email}`);
      }
    } catch (emailError) {
      console.error("[v0] Failed to send welcome email:", emailError);
    }

    if (
      currentUser &&
      currentUser._id.toString() !== savedUser._id.toString()
    ) {
      try {
        const notificationResult =
          await emailService.sendAccountCreationNotification(
            savedUser,
            currentUser
          );
        if (notificationResult.success) {
          console.log(
            `[v0] Account creation notification sent to manager: ${currentUser.email}`
          );
        }
      } catch (emailError) {
        console.error(
          "[v0] Failed to send account creation notification:",
          emailError
        );
      }
    }

    const { password: _, ...userResponse } = savedUser.toObject();

    res.status(201).json({
      message: "User Created Successfully!",
      user: userResponse,
    });
  } catch (err) {
    console.error("Create user error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const createUsers = async (req, res) => {
  try {
    let usersData = req.body;
    const currentUser = req.user;
    if (!Array.isArray(usersData)) usersData = [usersData];

    const defaultRole = await Role.findOne({ name: "user" });
    const savedUsers = [];
    const errors = [];

    for (const userData of usersData) {
      const { firstName, lastName, userName, email, password, age } = userData;
      const existingUser = await User.findOne({
        $or: [
          { email: email.toLowerCase() },
          { userName: userName.toLowerCase() },
        ],
      });

      if (existingUser) {
        errors.push({
          email,
          userName,
          message: "User with this email or username already exists",
        });
        continue;
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({
        firstName,
        lastName,
        userName: userName.toLowerCase(),
        email: email.toLowerCase(),
        password: hashedPassword,
        age,
        isVerified: true,
        roleId: defaultRole ? defaultRole._id : null,
      });

      const savedUser = await user.save();
      await savedUser.populate("roleId");

      try {
        const welcomeEmailResult = await emailService.sendWelcomeEmail(
          savedUser,
          currentUser
        );
        if (welcomeEmailResult.success) {
          console.log(
            `[v0] Welcome email sent to new user: ${savedUser.email}`
          );
        }
      } catch (emailError) {
        console.error(
          `[v0] Failed to send welcome email to ${savedUser.email}:`,
          emailError
        );
      }

      const { password: _, ...userResponse } = savedUser.toObject();
      savedUsers.push(userResponse);
    }

    if (currentUser && savedUsers.length > 0) {
      try {
        const bulkNotificationResult =
          await emailService.sendAccountCreationNotification(
            {
              firstName: `${savedUsers.length} Users`,
              lastName: "",
              userName: "bulk_creation",
              email: savedUsers.map((u) => u.email).join(", "),
              roleId: { displayName: "Various" },
            },
            currentUser
          );
        if (bulkNotificationResult.success) {
          console.log(
            `[v0] Bulk account creation notification sent to manager: ${currentUser.email}`
          );
        }
      } catch (emailError) {
        console.error(
          "[v0] Failed to send bulk account creation notification:",
          emailError
        );
      }
    }

    res.status(201).json({
      message: `Processed ${usersData.length} users.`,
      savedUsers,
      errors,
    });
  } catch (err) {
    console.error("Bulk create user error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const createUserWithEmailToken = async (req, res) => {
  try {
    const { firstName, lastName, userName, email, password, age } = req.body;
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { userName: userName.toLowerCase() },
      ],
    });

    if (existingUser)
      return res
        .status(409)
        .json({ message: "User with this email or username already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const defaultRole = await Role.findOne({ name: "user" });

    const user = new User({
      firstName,
      lastName,
      userName: userName.toLowerCase(),
      email: email.toLowerCase(),
      password: hashedPassword,
      age,
      isVerified: false,
      roleId: defaultRole ? defaultRole._id : null,
    });

    const savedUser = await user.save();
    const token = uuidv4();
    const tokenExpiration = new Date(
      Date.now() + config.emailTokenExpiration.emailTokenExpiry
    );

    const emailToken = new EmailToken({
      userId: savedUser._id,
      verificationToken: token,
      tokenExpiration,
    });

    await emailToken.save();
    await emailServiceForToken.sendTokenEmail(
      savedUser.email,
      token,
      savedUser.firstName
    );

    res.status(201).json({
      message:
        "User created successfully! Verification token sent to email (development mode).",
      user: savedUser,
    });
  } catch (err) {
    console.error("Create user error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getUser = async (req, res) => {
  try {
    const users = await User.find({ isDeleted: false }).populate({
      path: "roleId",
      select: "name displayName permissions",
      match: { name: { $ne: "admin" } },
    });
    const filteredUsers = users.filter((user) => user.roleId !== null);
    res.json(filteredUsers);
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getAllUser = async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1;
    const limit = Number.parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const roleId = req.query.roleId;
    const search = req.query.search;

    const filter = {};
    if (roleId) filter.roleId = roleId;
    if (search)
      filter.$or = [
        { email: { $regex: search, $options: "i" } },
        { userName: { $regex: search, $options: "i" } },
      ];

    const adminRole = await Role.findOne({ name: "admin" });
    if (adminRole)
      filter.roleId = filter.roleId
        ? { $eq: filter.roleId, $ne: adminRole._id }
        : { $ne: adminRole._id };

    const users = await User.find(filter)
      .populate("roleId", "name displayName")
      .skip(skip)
      .limit(limit);
    const total = await User.countDocuments(filter);

    res.json({
      users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("Get all users error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid user ID format" });

    const user = await User.findById(id, { password: 0 }).populate(
      "roleId",
      "name displayName permissions"
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (err) {
    console.error("Get user by ID error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateUser = async (req, res) => {
  try {
    const id = req.userId;
    const { password, ...updateData } = req.body;

    const user = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      select: "-password",
    }).populate("roleId", "name displayName permissions");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "User updated successfully", user });
  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const softDeleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(
      id,
      {
        isDeleted: true,
        deletedAt: new Date(),
        status: "inactive",
        isLoggedIn: false,
      },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      message:
        "User soft deleted. Will be permanently deleted after 30 days unless restored.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const restoreSoftDeletedUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(
      id,
      { isDeleted: false, deletedAt: null, status: "active" },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "User restored successfully", user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createUser,
  createUsers,
  createUserWithEmailToken,
  getUser,
  getUserById,
  updateUser,
  deleteUser,
  softDeleteUser,
  restoreSoftDeletedUser,
  getAllUser,
};
