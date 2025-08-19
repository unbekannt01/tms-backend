require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/database");
const { initializeModules } = require("./module");
const { globalLimiter, apiLimiter } = require("./middleware/rateLimiter");

require("./cron/deleteUsers.cron")

const app = express();

// Trust proxy (important for express-rate-limit behind Render/Vercel/Heroku/Nginx)
app.set("trust proxy", 1);

// Apply global rate limiter
app.use(globalLimiter);

// Middleware
app.use(
  cors({
    origin: [
      process.env.FRONTEND_LOCAL_URL,
      process.env.FRONTEND_HOST_URL,
      process.env.FRONTEND_URL,
      /\.render\.com$/,
      /\.vercel\.app$/,
    ].filter(Boolean),
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// API-specific rate limiter
app.use("/api", apiLimiter);

// Routes
initializeModules(app);

// 404 Handler
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route not found" });
});

const PORT = process.env.PORT || 3001;

// Initialize Database & Start Server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
