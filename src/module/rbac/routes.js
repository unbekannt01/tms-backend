const { Router } = require("express")
const { createRole, getRoles, updateRole, assignRole } = require("./controllers/role.controller")
const sessionAuthMiddleware = require("../../middleware/sessionAuth")
const { requirePermission } = require("./middleware/permission.middlewar")

const router = Router()

router.post("/roles", sessionAuthMiddleware, requirePermission("role:manage"), createRole)
router.get("/roles", sessionAuthMiddleware, getRoles)
router.put("/roles/:id", sessionAuthMiddleware, requirePermission("role:manage"), updateRole)
router.post("/roles/assign", sessionAuthMiddleware, requirePermission("role:assign"), assignRole)

module.exports = router
