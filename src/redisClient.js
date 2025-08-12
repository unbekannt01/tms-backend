const Redis = require("ioredis")

const redis = new Redis({
  host: "redis-12866.c9.us-east-1-4.ec2.redns.redis-cloud.com",
  port: 12866,
  username: "default",
  password: "U3eZBlg2OGRrSYI8GMAeRn4wzl2fDZ1K",
})

redis.on("connect", () => {
  console.log("Connected to Redis")
})

redis.on("error", (err) => {
  console.error("Redis connection error:", err)
})

module.exports = redis // CommonJS export
