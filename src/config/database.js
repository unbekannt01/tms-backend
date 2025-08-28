const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

// Determine environment
const nodeEnv = process.env.NODE_ENV || "dev";

// Resolve env file path
const envFile = path.resolve(process.cwd(), `.env.${nodeEnv}`);
const fallbackEnv = path.resolve(process.cwd(), ".env");

// Load environment file
let envPath = envFile;
if (!fs.existsSync(envFile)) {
  if (fs.existsSync(fallbackEnv)) {
    envPath = fallbackEnv;
  } else {
    console.error(` Environment file not found: ${envFile}`);
    process.exit(1);
  }
}

dotenv.config({ path: envPath });

async function connectDB() {
  if (!process.env.MONGO_URI) {
    console.error(
      " MongoDB connection string not found. Please set MONGO_URI in your environment file."
    );
    process.exit(1);
  }

  try {
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 5,
    };

    await mongoose.connect(process.env.MONGO_URI, options);
    console.log(" MongoDB connected:", mongoose.connection.host);
  } catch (error) {
    console.error(" Database connection error:", error.message);
    process.exit(1);
  }
}

// Connection event listeners
mongoose.connection.on("error", (err) => {
  console.error(" MongoDB connection error:", err.message);
});

mongoose.connection.on("disconnected", () => {
  console.log(" MongoDB disconnected");
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log(" MongoDB connection closed");
  process.exit(0);
});

module.exports = connectDB;
