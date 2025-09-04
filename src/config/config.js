// config/config.js
require("dotenv").config();

module.exports = {
  postgres: {
    host: process.env.DB_HOST,
    port: Number.parseInt(process.env.DB_PORT, 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
  mongo: {
    uri: process.env.MONGO_URI,
  },
  server: {
    port: Number.parseInt(process.env.PORT, 10) || 3001,
  },
  jwt: {
    secret: process.env.JWT_SECRET_KEY,
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
  },
  bcrypt: {
    saltRounds: Number.parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10,
  },
  redis: {
    ttlSeconds: Number.parseInt(process.env.REDIS_TTL_SECONDS, 10) || 3600,
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number.parseInt(process.env.SMTP_PORT, 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    secure: process.env.SMTP_SECURE === "true",
  },
  emailTokenExpiration: {
    emailTokenExpiry:
      Number.parseInt(process.env.EMAIL_VERIFICATION_TOKEN_EXPIRATION_MS) ||
      86400000,
  },
  url: {
    frontend_local_url: process.env.FRONTEND_LOCAL_URL,
    frontend_host_url: process.env.FRONTEND_HOST_URL,
    frontend_url: process.env.FRONTEND_URL,
    dev_link: process.env.DEV_LINK,
  },
  ai: {
    gemini: {
      enabled: true,
      apiKey: process.env.GEMINI_API_KEY,
    }
  },
};
