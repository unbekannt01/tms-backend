// config/config.js
require("dotenv").config();

module.exports = {
  postgres: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
  mongo: {
    uri: process.env.MONGO_URI,
  },
  server: {
    port: parseInt(process.env.PORT, 10) || 3000,
  },
  jwt: {
    secret: process.env.JWT_SECRET_KEY,
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
  },
  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10,
  },
  redis: {
    ttlSeconds: parseInt(process.env.REDIS_TTL_SECONDS, 10) || 3600,
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    secure: process.env.SMTP_SECURE === "true",
  },
  emailTokenExpiration : {
    emailTokenExpiry : parseInt(process.env.EMAIL_VERIFICATION_TOKEN_EXPIRATION_MS) || 86400000,
  }
};
