const Role = require("../models/Role")
const User = require("../../user/models/User")

const createRole = async (req, res) => {
  try {
    const { name, displayName, description, permissions } = req.body

    const existingRole = await Role.findOne({ name })
    if (existingRole) {
      return res.status(409).json({ message: "Role already exists" })
    }

    const role = new Role({
      name,
      displayName,
      description,
      permissions,
    })

    const savedRole = await role.save()
    res.status(201).json({
      message: "Role created successfully",
      role: savedRole,
    })
  } catch (error) {
    console.error("Create role error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
}

const getRoles = async (req, res) => {
  try {
    const roles = await Role.find({ isActive: true })
    res.json(roles)
  } catch (error) {
    console.error("Get roles error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
}

const updateRole = async (req, res) => {
  try {
    const { id } = req.params
    const updateData = req.body

    const role = await Role.findByIdAndUpdate(id, updateData, { new: true })
    if (!role) {
      return res.status(404).json({ message: "Role not found" })
    }

    res.json({
      message: "Role updated successfully",
      role,
    })
  } catch (error) {
    console.error("Update role error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
}

const assignRole = async (req, res) => {
  try {
    const { userId, roleId } = req.body

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    const role = await Role.findById(roleId)
    if (!role) {
      return res.status(404).json({ message: "Role not found" })
    }

    user.roleId = roleId
    await user.save()

    res.json({
      message: "Role assigned successfully",
      user: { ...user.toObject(), password: undefined },
    })
  } catch (error) {
    console.error("Assign role error:", error)
    res.status(500).json({ message: "Internal server error" })
  }
}

module.exports = {
  createRole,
  getRoles,
  updateRole,
  assignRole,
}
