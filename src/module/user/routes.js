const { Router } = require("express")
const {
  createUser,
  deleteUser,
  getUser,
  getUserById,
  updateUser,
  createUserWithEmailToken,
  getUserWithBooks,
  getAllUsersWithBooks,
  getUsersByActivity,
  getUserPreferences,
} = require("./controllers/user.controller")
const sessionAuthMiddleware = require("../../middleware/sessionAuth")

const router = Router()

router.post("/users/register", sessionAuthMiddleware, createUser)
router.post("/users/v2/register", sessionAuthMiddleware, createUserWithEmailToken)

// Specific GET routes first
router.get("/users/activity", sessionAuthMiddleware, getUsersByActivity)
router.get("/users/getUserWithBooks/:userId", sessionAuthMiddleware, getUserWithBooks)
router.get("/usersWithBooks", sessionAuthMiddleware, getAllUsersWithBooks)
router.get("/users/preferences/:userId", sessionAuthMiddleware, getUserPreferences)
router.get("/users", sessionAuthMiddleware, getUser)

// Generic param routes last
router.get("/users/:id", sessionAuthMiddleware, getUserById)
router.put("/users/:id", sessionAuthMiddleware, updateUser)
router.delete("/users/:id", sessionAuthMiddleware, deleteUser)

module.exports = router
