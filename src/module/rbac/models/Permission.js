const mongoose = require("mongoose")

const permissionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    resource: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    scope: {
      type: String,
      enum: ["own", "team", "all"],
      default: "own",
    },
    description: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "permissions",
  },
)

module.exports = mongoose.model("Permission", permissionSchema)
