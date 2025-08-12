const { Router } = require("express");
const {
  createUser,
  deleteUser,
  getUser,
  getUserById,
  loginUser,
  updateUser,
  logOutUser,
  createUserWithEmailToken,
  getUserWithBooks,
  getAllUsersWithBooks,
  getUsersByActivity,
  getUserPreferences,
} = require("../controller/user.controller");
const authMiddleware = require("../middleware/auth");

const router = Router();

router.post("/users/register", createUser);
router.post("/users/v2/register", createUserWithEmailToken);
router.post("/users/login", loginUser);
router.post("/users/logout", authMiddleware, logOutUser);

// Specific GET routes first
router.get("/users/activity", getUsersByActivity);
router.get("/users/getUserWithBooks/:userId", getUserWithBooks);
router.get("/usersWithBooks", getAllUsersWithBooks);
router.get("/users/preferences/:userId", getUserPreferences);
router.get("/users", getUser);

// Generic param routes last
router.get("/users/:id", getUserById);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

module.exports = router;
