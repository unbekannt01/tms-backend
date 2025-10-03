const mongoose = require("mongoose")

const systemSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true }, // e.g., "global"
    maintenanceMode: { type: Boolean, default: false },
    maintenanceMessage: { type: String, default: "" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
)

// Ensure a singleton "global" document exists
systemSettingSchema.statics.getGlobal = async function () {
  let doc = await this.findOne({ key: "global" })
  if (!doc) {
    doc = await this.create({ key: "global", maintenanceMode: false })
  }
  return doc
}

module.exports = mongoose.model("SystemSetting", systemSettingSchema)
