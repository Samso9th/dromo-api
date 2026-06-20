// Config consumed by sequelize-cli (migrations/seeders). The app itself uses src/config/database.ts.
require("dotenv").config();

const useSsl = process.env.DB_SSL === "true";
const common = {
  url: process.env.DATABASE_URL,
  dialect: "postgres",
  dialectOptions: useSsl ? { ssl: { require: true, rejectUnauthorized: false } } : {},
  define: { underscored: true },
};

module.exports = {
  development: common,
  test: common,
  production: common,
};
