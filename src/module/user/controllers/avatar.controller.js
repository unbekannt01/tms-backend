// avatar.controller.js
const User = require("../models/User")
const { cloudinary } = require("../../../config/cloudinary")
const mongoose = require("mongoose")

// Upload or update avatar
const uploadAvatar = async (req, res) => {
  try {
    const userId = req.userId // From auth middleware

    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" })
    }

    // Find the user
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // If user already has an avatar, delete the old one from Cloudinary
    if (user.avatar && user.avatar.publicId) {
      try {
        await cloudinary.uploader.destroy(user.avatar.publicId)
        console.log(`[v1] Deleted old avatar: ${user.avatar.publicId}`)
      } catch (error) {
        console.error("[v1] Error deleting old avatar:", error)
      }
    }

    // Save the new avatar info
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        avatar: {
          publicId: req.file.filename, // store public_id only
        },
      },
      { new: true, select: "-password" },
    ).populate("roleId", "name displayName permissions")

    // Generate transformed URL for frontend (always optimized)
    const avatarUrl = cloudinary.url(req.file.filename, {
      transformation: [
        { width: 200, height: 200, crop: "fill", gravity: "face" },
        { quality: "auto" },
        { fetch_format: "auto" },
      ],
    })

    res.json({
      message: "Avatar uploaded successfully",
      user: updatedUser,
      avatar: {
        url: avatarUrl,
        publicId: req.file.filename,
      },
    })
  } catch (error) {
    console.error("[v1] Upload avatar error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
}

// Get user avatar
const getAvatar = async (req, res) => {
  try {
    const { userId } = req.params

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" })
    }

    const user = await User.findById(userId, "avatar firstName lastName")
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    if (!user.avatar || !user.avatar.publicId) {
      return res.status(404).json({ message: "No avatar found for this user" })
    }

    // Generate transformed URL
    const avatarUrl = cloudinary.url(user.avatar.publicId, {
      transformation: [
        { width: 200, height: 200, crop: "fill", gravity: "face" },
        { quality: "auto" },
        { fetch_format: "auto" },
      ],
    })

    res.json({
      avatar: {
        url: avatarUrl,
        publicId: user.avatar.publicId,
      },
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
      },
    })
  } catch (error) {
    console.error("[v1] Get avatar error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
}

// Delete avatar
const deleteAvatar = async (req, res) => {
  try {
    const userId = req.userId // From auth middleware

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    if (!user.avatar || !user.avatar.publicId) {
      return res.status(404).json({ message: "No avatar found to delete" })
    }

    // Delete from Cloudinary
    try {
      await cloudinary.uploader.destroy(user.avatar.publicId)
      console.log(`[v1] Deleted avatar from Cloudinary: ${user.avatar.publicId}`)
    } catch (error) {
      console.error("[v1] Error deleting from Cloudinary:", error)
    }

    // Remove avatar from user document
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $unset: { avatar: 1 } },
      { new: true, select: "-password" },
    ).populate("roleId", "name displayName permissions")

    res.json({
      message: "Avatar deleted successfully",
      user: updatedUser,
    })
  } catch (error) {
    console.error("[v1] Delete avatar error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
}

module.exports = {
  uploadAvatar,
  getAvatar,
  deleteAvatar,
}
