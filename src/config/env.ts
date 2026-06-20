import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(4000),
  APP_URL: z.string().url().default("http://localhost:8080"),
  API_URL: z.string().url().default("http://localhost:4000"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DB_SSL: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  REDIS_URL: z.string().default("redis://localhost:6379"),

  JWT_ACCESS_SECRET: z.string().min(1).default("dev-access-secret"),
  JWT_REFRESH_SECRET: z.string().min(1).default("dev-refresh-secret"),
  COOKIE_DOMAIN: z.string().default("localhost"),

  // Optional integrations — present in prod, blank-ok in early dev.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  LINKEDIN_CLIENT_ID: z.string().optional(),
  LINKEDIN_CLIENT_SECRET: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  CLOUDINARY_URL: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  DUBU_API_BASE: z.string().optional(),
  DUBU_API_KEY: z.string().optional(),
  DUBU_WEBHOOK_SECRET: z.string().optional(),
  DUBU_CHECKOUT_URL: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Invalid environment:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
