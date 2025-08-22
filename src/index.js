require("dotenv").config();
const express = require("express");
const { createServer } = require("http");
const cors = require("cors");
const connectDB = require("./config/database");
const { initializeModules } = require("./module");
const { globalLimiter, apiLimiter } = require("./middleware/rateLimiter");
const config = require("./config/config");
const socketService = require("./services/socketService");

require("./cron/deleteUsers.cron");
require("./cron/dueDateAlert.cron");

const app = express();
const server = createServer(app);

// Initialize Socket.IO
socketService.initialize(server);

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

app.get("/", (req, res) => {
  res.send("🚀 Server is running successfully with real-time notifications");
});

// Real-time stats endpoint
app.get("/api/realtime/stats", (req, res) => {
  const realTimeNotificationService = require("./services/realTimeNotificationService");
  res.json(realTimeNotificationService.getRealTimeStats());
});

// 404 Handler
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route not found" });
});

const PORT = process.env.PORT || 3001;

// Initialize Database & Start Server
const startServer = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Socket.IO server ready for real-time notifications`);
      if (process.env.PORT) {
        console.log(
          `Public URL: ${process.env.FRONTEND_URL || "Check Railway domain"}`
        );
      }
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
