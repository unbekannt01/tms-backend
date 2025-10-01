require("dotenv").config()
const express = require("express")
const cors = require("cors")
const connectDB = require("./config/database")
const { initializeModules } = require("./module")
const { globalLimiter, apiLimiter } = require("./middleware/rateLimiter")
const http = require("http")
const { initSocket } = require("./realtime/socket")

// Import cron jobs
require("./cron/deleteUsers.cron")
require("./cron/dueDateAlert.cron")

const app = express()

// Trust proxy (important for express-rate-limit behind Render/Vercel/Heroku/Nginx)
app.set("trust proxy", 1)

// Apply global rate limiter
app.use(globalLimiter)

// Middleware
app.use(
  cors({
    origin: [
      process.env.FRONTEND_LOCAL_URL,
      process.env.FRONTEND_HOST_URL,
      process.env.FRONTEND_URL,
      /\.render\.com$/,
      /\.railway\.com$/,
      /\.vercel\.app$/,
    ].filter(Boolean),
    credentials: true,
  }),
)

app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true }))

// API-specific rate limiter
app.use("/api", apiLimiter)

// Routes
initializeModules(app)

app.get("/", (req, res) => {
  res.send("🚀 Server is running successfully")
})

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date(),
    emailService: "active",
  })
})

// 🔹 Debug SMTP latency endpoint (add this before 404 handler)
const net = require("net")

app.get("/debug-smtp", (req, res) => {
  const start = Date.now()

  const socket = net.createConnection(587, "smtp.gmail.com", () => {
    const latency = Date.now() - start
    console.log("✅ SMTP connected in", latency, "ms")
    socket.end()
    res.json({ success: true, latency: `${latency} ms` })
  })

  socket.on("error", (err) => {
    console.error("❌ SMTP connection error:", err)
    res.json({ success: false, error: err.message })
  })
})

// 404 Handler
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route not found" })
})

const PORT = process.env.PORT || 3001

// Initialize Database & Start Server
const startServer = async () => {
  try {
    await connectDB()

    // Initialize socket server (CORS mirrors Express CORS)
    const server = http.createServer(app)
    initSocket(server, {
      cors: {
        origin: [
          process.env.FRONTEND_LOCAL_URL,
          process.env.FRONTEND_HOST_URL,
          process.env.FRONTEND_URL,
          /\.render\.com$/,
          /\.railway\.com$/,
          /\.vercel\.app$/,
        ].filter(Boolean),
        credentials: true,
      },
    })

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`)
      console.log(`Email service ready for task notifications`)
      if (process.env.PORT) {
        console.log(`Public URL: ${process.env.FRONTEND_URL || "Check deployment domain"}`)
      }
    })
  } catch (error) {
    console.error("Failed to start server:", error)
    process.exit(1)
  }
}

startServer()
