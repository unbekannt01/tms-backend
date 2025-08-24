const User = require("../models/User");
const Role = require("../../rbac/models/Role");
const Book = require("../../book/models/Book");
const EmailToken = require("../../auth/models/EmailToken");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");
const redis = require("../../../redisClient");
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

    if (!Array.isArray(usersData)) {
      usersData = [usersData];
    }

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

    if (existingUser) {
      return res.status(409).json({
        message: "User with this email or username already exists",
      });
    }

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
      tokenExpiration: tokenExpiration,
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

    if (roleId) {
      filter.roleId = roleId;
    }

    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: "i" } },
        { userName: { $regex: search, $options: "i" } },
      ];
    }

    const adminRole = await Role.findOne({ name: "admin" });
    if (adminRole) {
      filter.roleId = filter.roleId
        ? { $eq: filter.roleId, $ne: adminRole._id }
        : { $ne: adminRole._id };
    }

    const users = await User.find(filter)
      .populate("roleId", "name displayName")
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Get all users error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const user = await User.findById(id, { password: 0 }).populate(
      "roleId",
      "name displayName permissions"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const books = await Book.find(
      { userId: id, isDeleted: false },
      {
        name: 1,
        author: 1,
        price: 1,
      }
    );

    const userWithBooks = { ...user.toObject(), books };

    res.json(userWithBooks);
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

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "User updated successfully",
      user,
    });
  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

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
      {
        isDeleted: false,
        deletedAt: null,
        status: "active",
      },
      { new: true }
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "User restored successfully", user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserWithBooks = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await User.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(userId) } },
      {
        $lookup: {
          from: "book",
          localField: "_id",
          foreignField: "userId",
          as: "books",
        },
      },
      {
        $project: {
          userName: 1,
          email: 1,
          "books.name": 1,
          "books.author": 1,
          "books.price": 1,
        },
      },
    ]);

    res.json(result[0] || {});
  } catch (error) {
    console.error("Error in getUserWithBooks:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getAllUsersWithBooks = async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page, 10) || 1;
    const limit = Number.parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const total = await User.countDocuments();

    const data = await User.aggregate([
      {
        $lookup: {
          from: "book",
          localField: "_id",
          foreignField: "userId",
          as: "books",
        },
      },
      {
        $project: {
          userName: 1,
          email: 1,
          "books.name": 1,
          "books.author": 1,
          "books.price": 1,
        },
      },
      { $skip: skip },
      { $limit: limit },
    ]);

    res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data,
    });
  } catch (error) {
    console.error("Error in getAllUsersWithBooks:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getUsersByActivity = async (req, res) => {
  try {
    const {
      activityLevel = "all",
      minBooks = 0,
      maxBooks = 1000,
      sortBy = "bookCount",
      sortOrder = "desc",
    } = req.query;

    const pipeline = [
      {
        $lookup: {
          from: "book",
          localField: "_id",
          foreignField: "userId",
          as: "userBooks",
        },
      },
      {
        $addFields: {
          bookCount: { $size: "$userBooks" },
          totalBookValue: { $sum: "$userBooks.price" },
          avgBookPrice: { $avg: "$userBooks.price" },
          preferredAuthors: {
            $reduce: {
              input: "$userBooks",
              initialValue: [],
              in: { $concatArrays: ["$$value", ["$$this.author"]] },
            },
          },
          lastBookDate: { $max: "$userBooks.createdAt" },
        },
      },
      {
        $addFields: {
          activityScore: {
            $switch: {
              branches: [
                { case: { $gte: ["$bookCount", 10] }, then: "high" },
                { case: { $gte: ["$bookCount", 5] }, then: "medium" },
                { case: { $gte: ["$bookCount", 1] }, then: "low" },
              ],
              default: "inactive",
            },
          },
          uniqueAuthors: {
            $size: {
              $setUnion: ["$preferredAuthors", []],
            },
          },
        },
      },
    ];

    if (activityLevel !== "all") {
      pipeline.push({ $match: { activityScore: activityLevel } });
    }

    pipeline.push({
      $match: {
        bookCount: {
          $gte: Number.parseInt(minBooks),
          $lte: Number.parseInt(maxBooks),
        },
      },
    });

    const sortObj = {};
    sortObj[sortBy] = sortOrder === "desc" ? -1 : 1;
    pipeline.push({ $sort: sortObj });

    pipeline.push({
      $project: {
        firstName: 1,
        lastName: 1,
        userName: 1,
        email: 1,
        age: 1,
        bookCount: 1,
        totalBookValue: 1,
        avgBookPrice: 1,
        activityScore: 1,
        uniqueAuthors: 1,
        lastBookDate: 1,
        isLoggedIn: 1,
        preferredAuthors: { $slice: ["$preferredAuthors", 5] },
      },
    });

    const result = await User.aggregate(pipeline);

    res.json({
      message: "Users by activity retrieved successfully",
      count: result.length,
      users: result,
    });
  } catch (error) {
    console.error("Error in getUsersByActivity:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getUserPreferences = async (req, res) => {
  try {
    const { userId } = req.params;

    const pipeline = [
      { $match: { _id: new mongoose.Types.ObjectId(userId) } },
      {
        $lookup: {
          from: "book",
          localField: "_id",
          foreignField: "userId",
          as: "userBooks",
        },
      },
      {
        $addFields: {
          totalBooks: { $size: "$userBooks" },
          totalSpent: { $sum: "$userBooks.price" },
          avgBookPrice: { $avg: "$userBooks.price" },
          priceRange: {
            min: { $min: "$userBooks.price" },
            max: { $max: "$userBooks.price" },
          },
          recentBooksCount: { $size: "$userBooks" },
        },
      },
      {
        $addFields: {
          authorPreferences: {
            $reduce: {
              input: "$userBooks",
              initialValue: {},
              in: {
                $mergeObjects: [
                  "$$value",
                  {
                    $arrayToObject: [
                      [
                        {
                          k: "$$this.author",
                          v: {
                            $add: [
                              {
                                $ifNull: [
                                  {
                                    $getField: {
                                      field: "$$this.author",
                                      input: "$$value",
                                    },
                                  },
                                  0,
                                ],
                              },
                              1,
                            ],
                          },
                        },
                      ],
                    ],
                  },
                ],
              },
            },
          },
          spendingPattern: {
            $switch: {
              branches: [
                { case: { $gte: ["$avgBookPrice", 500] }, then: "premium" },
                { case: { $gte: ["$avgBookPrice", 200] }, then: "moderate" },
                { case: { $gte: ["$avgBookPrice", 100] }, then: "budget" },
              ],
              default: "economy",
            },
          },
        },
      },
      {
        $project: {
          firstName: 1,
          lastName: 1,
          userName: 1,
          email: 1,
          totalBooks: 1,
          totalSpent: 1,
          avgBookPrice: 1,
          priceRange: 1,
          spendingPattern: 1,
          authorPreferences: { $objectToArray: "$authorPreferences" },
          recentBooks: "$userBooks",
          recentBooksCount: 1,
        },
      },
    ];

    const result = await User.aggregate(pipeline);

    if (!result.length) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "User preferences retrieved successfully",
      preferences: result[0],
    });
  } catch (error) {
    console.error("Error in getUserPreferences:", error);
    res.status(500).json({ message: "Server Error" });
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
  getUserWithBooks,
  getAllUsersWithBooks,
  getUsersByActivity,
  getUserPreferences,
  softDeleteUser,
  restoreSoftDeletedUser,
  getAllUser,
};
