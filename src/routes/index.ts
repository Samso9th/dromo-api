import { Router } from "express";
import { sequelize } from "@/config/database";
import { asyncHandler } from "@/utils/app-error";
import { authRouter } from "@/modules/auth/routes";
import { modelsRouter } from "@/modules/models/routes";
import { billingRouter } from "@/modules/billing/routes";
import { resumeRouter } from "@/modules/resume/routes";
import { sessionsRouter } from "@/modules/sessions/routes";
import { filesRouter } from "@/modules/files/routes";

export const router = Router();

router.use("/auth", authRouter);
router.use("/models", modelsRouter);
router.use("/billing", billingRouter);
router.use("/resume", resumeRouter);
router.use("/sessions", sessionsRouter);
router.use("/files", filesRouter);

router.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "dromo-api", time: new Date().toISOString() });
});

router.get(
  "/health/db",
  asyncHandler(async (_req, res) => {
    await sequelize.authenticate();
    res.json({ status: "ok", db: "connected" });
  }),
);

// Still to mount: /webhooks (Stripe/Dubu), /files (Puppeteer), POST /resume/master (upload+parse).
