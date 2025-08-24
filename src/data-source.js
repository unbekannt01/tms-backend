require("reflect-metadata");
const { DataSource } = require("typeorm");
const { User } = require("./entity/User");
const { Otp } = require("./entity/Otp");
const { EmailToken } = require("./entity/EmailToken");
const dotenv = require("dotenv");

dotenv.config();

const AppDataSource = new DataSource({
  type: "mongodb",
  url: process.env.MONGO_URI,
  synchronize: true,
  useUnifiedTopology: true,
  entities: [User, Otp, EmailToken],
});

module.exports = { AppDataSource };
