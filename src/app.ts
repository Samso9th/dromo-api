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
  app.use(
    cors({
      origin: env.APP_URL, // SPA origin; cookies require a specific origin (not "*")
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
