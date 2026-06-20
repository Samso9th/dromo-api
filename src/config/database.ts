import { Sequelize } from "sequelize";
import { env } from "./env";
import { logger } from "./logger";

export const sequelize = new Sequelize(env.DATABASE_URL, {
  dialect: "postgres",
  logging: (msg) => logger.debug(msg),
  dialectOptions: env.DB_SSL
    ? { ssl: { require: true, rejectUnauthorized: false } }
    : {},
  define: {
    underscored: true, // snake_case columns + created_at/updated_at
    freezeTableName: false,
  },
  pool: { max: 10, min: 0, idle: 10_000 },
});

export async function assertDbConnection(): Promise<void> {
  await sequelize.authenticate();
  logger.info("✅ Postgres connected");
}
