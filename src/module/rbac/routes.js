const { Router } = require("express")
const { createRole, getRoles, updateRole, assignRole } = require("./controllers/role.controller")
const authMiddleware = require("../../middleware/auth")
const { requirePermission } = require("./middleware/permission.middlewar")

const router = Router()

router.post("/roles", authMiddleware, requirePermission("role:manage"), createRole)
router.get("/roles", authMiddleware, getRoles)
router.put("/roles/:id", authMiddleware, requirePermission("role:manage"), updateRole)
router.post("/roles/assign", authMiddleware, requirePermission("role:assign"), assignRole)

module.exports = router
