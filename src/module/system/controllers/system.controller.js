const SystemSetting = require("../models/SystemSetting")

const getMaintenanceStatus = async (req, res) => {
  try {
    const settings = await SystemSetting.getGlobal()
    return res.json({
      active: !!settings.maintenanceMode,
      message: settings.maintenanceMessage || "",
      updatedAt: settings.updatedAt,
    })
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch maintenance status" })
  }
}

const setMaintenanceStatus = async (req, res) => {
  try {
    const { active, message } = req.body || {}
    const settings = await SystemSetting.getGlobal()
    settings.maintenanceMode = !!active
    if (typeof message === "string") settings.maintenanceMessage = message
    if (req.userId) settings.updatedBy = req.userId
    await settings.save()
    return res.json({
      active: settings.maintenanceMode,
      message: settings.maintenanceMessage || "",
      updatedAt: settings.updatedAt,
    })
  } catch (err) {
    return res.status(500).json({ message: "Failed to update maintenance status" })
  }
}

module.exports = { getMaintenanceStatus, setMaintenanceStatus }
