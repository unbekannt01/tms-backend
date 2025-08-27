const mongoose = require("mongoose")
require("dotenv").config()

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI

    if (!mongoUri) {
      throw new Error("MongoDB connection string not found. Please set MONGO_URI or MONGODB_URI environment variable.")
    }

    const conn = await mongoose.connect(mongoUri)
    console.log(`MongoDB Connected: ${conn.connection.host}`)

    const { initializeRoles } = require("../../scripts/initializeRoles")
    await initializeRoles()
  } catch (error) {
    console.error("❌ Database connection error:", error)
    process.exit(1)
  }
}

module.exports = connectDB
