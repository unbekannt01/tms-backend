const mongoose = require("mongoose")

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    userName: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    age: {
      type: Number,
      min: 1,
    },
    isLoggedIn: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "inactive",
    },
  },
  {
    timestamps: true,
    collection: "user_1",
  },
)

// Virtual for user's books
userSchema.virtual("books", {
  ref: "Book",
  localField: "_id",
  foreignField: "userId",
})

// Ensure virtual fields are serialized
userSchema.set("toJSON", { virtuals: true })
userSchema.set("toObject", { virtuals: true })

module.exports = mongoose.model("User", userSchema)
