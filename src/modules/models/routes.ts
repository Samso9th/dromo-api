import { Router } from "express";
import { requireAuth } from "@/middleware/require-auth";
import { asyncHandler } from "@/utils/app-error";
import { listEnabledModels, serializeModel } from "@/services/pricing";

export const modelsRouter = Router();

// GET /models — enabled models (real names + tier + pricing in $/M) for the picker.
modelsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const models = await listEnabledModels();
    res.json(models.map(serializeModel));
  }),
);
