const bcrypt = require("bcrypt");
const User = require("../models/User");

const generateBackupCodes = async (userId, count = 5) => {
  const codes = [];
  for (let i = 0; i < count; i++) {
    codes.push(Math.random().toString(36).substring(2, 8).toUpperCase()); // simple 6-char codes
  }

  const hashedCodes = await Promise.all(
    codes.map((code) => bcrypt.hash(code, 10))
  );

  // Save only hashed codes
  await User.findByIdAndUpdate(userId, {
    backupCodes: hashedCodes.map((h) => ({ code: h })),
  });

  return codes; // return raw codes for user to save
};

const verifyBackupCodeByEmail = async (email, code) => {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !user.backupCodes) return false;

  for (const bc of user.backupCodes) {
    if (await bcrypt.compare(code, bc.code)) {
      // Code matches; no used tracking
      return true;
    }
  }
  return false;
};

module.exports = {
  generateBackupCodes,
  verifyBackupCodeByEmail,
};
