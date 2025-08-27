const mongoose = require("mongoose")

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: ["admin", "manager", "user", "owner", "project-owner", "team-leader", "developer", "intern", "guest", "hr"],
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

          // Project permissions
          "project:create",
          "project:read:own",
          "project:read:team",
          "project:read:all",
          "project:update:own",
          "project:update:team",
          "project:update:all",
          "project:delete:own",
          "project:delete:team",
          "project:delete:all",
          "project:manage",

          // Team permissions
          "team:create",
          "team:read:own",
          "team:read:all",
          "team:update:own",
          "team:update:all",
          "team:delete:own",
          "team:delete:all",
          "team:manage",
          "team:lead",

          // HR permissions
          "hr:employee:create",
          "hr:employee:read",
          "hr:employee:update",
          "hr:employee:delete",
          "hr:payroll:manage",
          "hr:performance:manage",

          // Company permissions
          "company:settings:manage",
          "company:billing:manage",
          "company:analytics:view",

          // Guest permissions
          "guest:view:limited",
        ],
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    hierarchyLevel: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
    },
  },
  {
    timestamps: true,
    collection: "roles",
  },
)

module.exports = mongoose.model("Role", roleSchema)
