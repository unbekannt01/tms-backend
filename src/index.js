require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/database");
const userRoutes = require("./routes/user.routes");
const bookRoutes = require("./routes/book.routes");
const otpRoutes = require("./routes/otp.routes");
const passwordRoutes = require("./routes/password.routes");
const emailTokenRoutes = require("./routes/emailToken.routes");
require("dotenv").config;

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use(
  "/api",
  userRoutes,
  bookRoutes,
  otpRoutes,
  passwordRoutes,
  emailTokenRoutes
);

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
