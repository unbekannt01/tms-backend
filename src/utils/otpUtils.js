// utils/otpUtils.js
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000);
}

function expiresOtp() {
  return new Date(Date.now() + 5 * 60 * 1000); // 2 minutes from now
}

// Helper function to get expiry time in minutes for display
function getOtpExpiryMinutes() {
  return 5;
}

module.exports = {
  generateOtp,
  expiresOtp,
  getOtpExpiryMinutes,
};
