require("dotenv").config()
const express = require("express")
const cors = require("cors")
const connectDB = require("./config/database")
const { initializeModules } = require("./module")
const { globalLimiter, apiLimiter } = require("./middleware/rateLimiter")

const app = express()

app.use(globalLimiter)

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      process.env.FRONTEND_URL,
      /\.render\.com$/,
      /\.vercel\.app$/
    ].filter(Boolean),
    credentials: true,
  }),
)
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true }))

app.use("/api", apiLimiter)

// Routes
initializeModules(app)

// 404 Handler
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route not found" })
})

const PORT = process.env.PORT || 3001

// Initialize Database & Start Server
const startServer = async () => {
  try {
    await connectDB()
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error("Failed to start server:", error)
    process.exit(1)
  }
}

startServer()
