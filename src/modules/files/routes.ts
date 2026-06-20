import { Router } from "express";
import { requireAuth } from "@/middleware/require-auth";
import { asyncHandler, badRequest, notFound } from "@/utils/app-error";
import { reqUser } from "@/utils/req-user";
import { GenerationSession } from "@/models";
import { buildFile, type FileKind } from "@/services/files.service";
import type { DocFormat } from "@/types";

export const filesRouter = Router();

const KINDS: FileKind[] = ["resume", "cover-letter", "interview-brief"];
const FORMATS: DocFormat[] = ["pdf", "docx", "txt", "md"];

// GET /files/:kind/:sessionId?format=pdf|docx|txt|md
filesRouter.get(
  "/:kind/:sessionId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const kind = req.params.kind as FileKind;
    if (!KINDS.includes(kind)) throw badRequest("Unknown document kind");
    const format = String(req.query.format ?? "pdf") as DocFormat;
    if (!FORMATS.includes(format)) throw badRequest("Unknown format");

    const session = await GenerationSession.findOne({
      where: { id: req.params.sessionId, userId: reqUser(req).id },
    });
    if (!session) throw notFound("Session not found");

    const file = await buildFile(session, kind, format);
    res.setHeader("Content-Type", file.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
    res.send(file.buffer);
  }),
);
