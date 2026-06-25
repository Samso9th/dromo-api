import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { env } from "@/config/env";
import { router } from "@/routes";
import { webhooksRouter } from "@/modules/webhooks/routes";
import { configurePassport } from "@/config/passport";
import { errorHandler, notFoundHandler } from "@/middleware/error";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1); // correct req.ip behind a proxy

  app.use(helmet());
  // Allow the configured SPA origin plus dromo.tech and any of its subdomains.
  // A function origin is required because cookies forbid "*"; we still echo back
  // a single specific origin per request.
  const isAllowedOrigin = (origin: string): boolean => {
    if (origin === env.APP_URL) return true;
    try {
      const { hostname } = new URL(origin);
      return hostname === "dromo.tech" || hostname.endsWith(".dromo.tech");
    } catch {
      return false;
    }
  };
  app.use(
    cors({
      origin: (origin, callback) => {
        // Non-browser requests (curl, server-to-server) have no Origin header.
        if (!origin || isAllowedOrigin(origin)) return callback(null, true);
        return callback(new Error(`Origin not allowed by CORS: ${origin}`));
      },
      credentials: true,
    }),
  );

  // Webhooks need the RAW body for signature verification — mount BEFORE the json parser.
  app.use("/api/v1/webhooks", express.raw({ type: "*/*" }), webhooksRouter);

  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(configurePassport().initialize()); // OAuth strategies (session: false)

  app.use("/api/v1", router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
