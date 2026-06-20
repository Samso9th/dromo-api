import type { Request } from "express";
import { asyncHandler, notFound } from "@/utils/app-error";
import { reqUser } from "@/utils/req-user";
import { GenerationSession } from "@/models";
import { getModelOrThrow } from "@/services/pricing";
import {
  assertConcurrentAvailable,
  assertModelAllowed,
  assertTemplateAllowed,
} from "@/services/limits.service";
import { DEFAULT_MODEL_ID, DEFAULT_TEMPLATE_ID } from "@/constants/templates";
import { loadSessionDetail, serializeList } from "./serialize";
import * as gen from "@/services/generation.service";
import type { Plan } from "@/types";

async function owned(req: Request): Promise<GenerationSession> {
  const session = await GenerationSession.findOne({
    where: { id: req.params.id, userId: reqUser(req).id },
  });
  if (!session) throw notFound("Session not found");
  return session;
}

export const create = asyncHandler(async (req, res) => {
  const user = reqUser(req);
  await assertConcurrentAvailable(user.id, user.plan as Plan);
  const modelId = req.body.modelId || DEFAULT_MODEL_ID;
  const templateId = req.body.templateId || DEFAULT_TEMPLATE_ID;
  const model = await getModelOrThrow(modelId);
  assertModelAllowed(model.tier, user.plan as Plan, model.name);
  assertTemplateAllowed(templateId, user.plan as Plan);

  const session = await GenerationSession.create({
    userId: user.id,
    company: req.body.company?.trim() || "Untitled",
    role: req.body.role?.trim() || "Untitled role",
    jobUrl: req.body.jobUrl || null,
    jobDescription: req.body.jobDescription,
    modelId,
    templateId,
    retries: { tailor: 0, cover: 0, brief: 0 },
  });
  res.status(201).json(await loadSessionDetail(session));
});

export const list = asyncHandler(async (req, res) => {
  const sessions = await GenerationSession.findAll({
    where: { userId: reqUser(req).id },
    order: [["createdAt", "DESC"]],
  });
  res.json(await serializeList(sessions));
});

export const get = asyncHandler(async (req, res) => {
  res.json(await loadSessionDetail(await owned(req)));
});

export const patch = asyncHandler(async (req, res) => {
  const session = await owned(req);
  session.status = req.body.status;
  await session.save();
  res.json(await loadSessionDetail(session));
});

export const remove = asyncHandler(async (req, res) => {
  await (await owned(req)).destroy();
  res.json({ ok: true });
});

export const setModel = asyncHandler(async (req, res) => {
  const session = await owned(req);
  const user = reqUser(req);
  const model = await getModelOrThrow(req.body.modelId);
  assertModelAllowed(model.tier, user.plan as Plan, model.name);
  session.modelId = model.id;
  await session.save();
  res.json(await loadSessionDetail(session));
});

export const setTemplate = asyncHandler(async (req, res) => {
  const session = await owned(req);
  assertTemplateAllowed(req.body.templateId, reqUser(req).plan as Plan);
  session.templateId = req.body.templateId;
  await session.save();
  res.json(await loadSessionDetail(session));
});

export const tailor = asyncHandler(async (req, res) => {
  res.json(await gen.runTailor(await owned(req), reqUser(req)));
});
export const cover = asyncHandler(async (req, res) => {
  res.json(await gen.runCover(await owned(req), reqUser(req), req.body.tone || "professional"));
});
export const chat = asyncHandler(async (req, res) => {
  res.json(await gen.runChat(await owned(req), reqUser(req), req.body.question));
});
export const brief = asyncHandler(async (req, res) => {
  res.json(await gen.runBrief(await owned(req), reqUser(req), req.body));
});
