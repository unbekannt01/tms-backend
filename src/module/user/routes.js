const { Router } = require("express");
const {
  createUser,
  deleteUser,
  getUser,
  getUserById,
  updateUser,
  createUserWithEmailToken,
  softDeleteUser,
  restoreSoftDeletedUser,
  getAllUser,
} = require("./controllers/user.controller");
const {
  uploadAvatar,
  getAvatar,
  deleteAvatar,
} = require("./controllers/avatar.controller");
const sessionAuthMiddleware = require("../../middleware/sessionAuth");
const adminAuthMiddleware = require("../../middleware/adminAuthMiddleware");
const { upload } = require("../../config/cloudinary");

const router = Router();

router.post("/users/register", createUser);
router.post("/users/v2/register", createUserWithEmailToken);

router.post(
  "/users/avatar",
  sessionAuthMiddleware,
  upload.single("avatar"),
  uploadAvatar
);
router.get("/users/avatar/:userId", getAvatar);
router.delete("/users/avatar", sessionAuthMiddleware, deleteAvatar);

// Specific GET routes first
router.get("/users/activity", sessionAuthMiddleware);
router.get("/users/getUserWithBooks/:userId", sessionAuthMiddleware);
router.get("/usersWithBooks", sessionAuthMiddleware);
router.get("/users/preferences/:userId", sessionAuthMiddleware);
router.get("/users", sessionAuthMiddleware, getUser);
router.get(
  "/users/getAllUsers",
  sessionAuthMiddleware,
  adminAuthMiddleware,
  getAllUser
);

// Generic param routes last
router.get("/users/:id", sessionAuthMiddleware, getUserById);
router.put("/users", sessionAuthMiddleware, updateUser);
router.delete(
  "/users/:id",
  sessionAuthMiddleware,
  adminAuthMiddleware,
  deleteUser
);

router.patch("/users/softDelete/:id", sessionAuthMiddleware, softDeleteUser);
router.patch(
  "/users/restoreUser/:id",
  sessionAuthMiddleware,
  adminAuthMiddleware,
  restoreSoftDeletedUser
);

module.exports = router;
