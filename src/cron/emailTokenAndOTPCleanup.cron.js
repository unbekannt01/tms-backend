const cron = require("node-cron");
const mongoose = require("mongoose");
const EmailToken = require("../models/EmailToken");
const Otp = require("../models/Otp");

// Run every hour
cron.schedule("0 * * * *", async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
    }

    // Remove EmailTokens older than 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const emailDeleteResult = await EmailToken.deleteMany({
      createdAt: { $lt: twentyFourHoursAgo },
    });

    // Remove expired OTPs
    const now = new Date();
    const otpDeleteResult = await Otp.deleteMany({
      otpExpiration: { $lt: now },
    });

    console.log(
      `[CRON] EmailToken cleanup removed ${emailDeleteResult.deletedCount} documents`
    );
    console.log(
      `[CRON] OTP cleanup removed ${otpDeleteResult.deletedCount} documents`
    );
  } catch (error) {
    console.error("[CRON] Cleanup error:", error);
  }
});
