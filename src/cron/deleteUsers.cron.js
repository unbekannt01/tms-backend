// src/cron/deleteUsers.cron.js
const cron = require("node-cron");
const User = require("../module/user/models/User");

// Function to permanently delete users soft-deleted over 30 days ago
const cleanupDeletedUsers = async () => {
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  const now = new Date();

  try {
    const usersToDelete = await User.find({
      isDeleted: true,
      deletedAt: { $lte: new Date(now - THIRTY_DAYS) },
    });

    if (usersToDelete.length > 0) {
      await User.deleteMany({
        _id: { $in: usersToDelete.map((u) => u._id) },
      });
      console.log(`Permanently deleted ${usersToDelete.length} users`);
    } else {
      console.log("No users to delete at this time");
    }
  } catch (err) {
    console.error("Error in cleanup job:", err.message);
  }
};

// Run cleanup immediately on server start
cleanupDeletedUsers();

// Schedule cron job every hour
cron.schedule("0 * * * *", () => {
  console.log("Running hourly cleanup job...");
  cleanupDeletedUsers();
});
