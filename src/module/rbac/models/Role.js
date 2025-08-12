const mongoose = require("mongoose")

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: ["admin", "manager", "user"],
    },
    displayName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    permissions: [
      {
        type: String,
        enum: [
          // Task permissions
          "task:create:own",
          "task:create:others",
          "task:read:own",
          "task:read:team",
          "task:read:all",
          "task:update:own",
          "task:update:team",
          "task:update:all",
          "task:delete:own",
          "task:delete:team",
          "task:delete:all",
          "task:assign",

          // User permissions
          "user:create",
          "user:read:own",
          "user:read:all",
          "user:update:own",
          "user:update:all",
          "user:delete:own",
          "user:delete:all",

          // Role permissions
          "role:assign",
          "role:manage",

          // System permissions
          "system:admin",
        ],
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "roles",
  },
)

module.exports = mongoose.model("Role", roleSchema)
