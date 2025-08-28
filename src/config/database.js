const mongoose = require("mongoose");

// Only load .env files in development (not in Railway/production)
if (process.env.NODE_ENV !== "prod" && !process.env.RAILWAY_ENVIRONMENT) {
  const dotenv = require("dotenv");
  const path = require("path");
  const fs = require("fs");

  const nodeEnv = process.env.NODE_ENV || "dev";
  const envFile = path.resolve(process.cwd(), `.env.${nodeEnv}`);
  const fallbackEnv = path.resolve(process.cwd(), ".env");

  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile });
  } else if (fs.existsSync(fallbackEnv)) {
    dotenv.config({ path: fallbackEnv });
  }
}

async function connectDB() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI environment variable not found");
    process.exit(1);
  }

  try {
    const options = {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 5,
    };

    await mongoose.connect(process.env.MONGO_URI, options);
    console.log("MongoDB connected:", mongoose.connection.host);
  } catch (error) {
    console.error("Database connection error:", error.message);
    process.exit(1);
  }
}

// Connection event listeners
mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err.message);
});

mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected");
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("MongoDB connection closed");
  process.exit(0);
});

module.exports = connectDB;
