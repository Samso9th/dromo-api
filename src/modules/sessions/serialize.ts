import { Op } from "sequelize";
import {
  ChatMessage,
  CoverLetter,
  GenerationSession,
  InterviewBrief,
  TailoredResume,
} from "@/models";

interface Bundle {
  tailored?: TailoredResume | null;
  cover?: CoverLetter | null;
  chat?: ChatMessage[];
  brief?: InterviewBrief | null;
}

/** Build the embedded shape the frontend GenerationSession expects. */
export function serializeSession(s: GenerationSession, a: Bundle) {
  return {
    id: s.id,
    company: s.company,
    role: s.role,
    jobUrl: s.jobUrl ?? undefined,
    jobDescription: s.jobDescription,
    modelId: s.modelId,
    templateId: s.templateId,
    status: s.status,
    retries: s.retries,
    createdAt: s.createdAt,
    tailoredResume: a.tailored?.data ?? undefined,
    coverLetter: a.cover
      ? {
          greeting: a.cover.greeting,
          body: a.cover.body,
          closing: a.cover.closing,
          signature: a.cover.signature,
        }
      : undefined,
    chat: (a.chat ?? []).map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    })),
    interviewBrief: a.brief
      ? {
          content: a.brief.content,
          type: a.brief.type,
          tone: a.brief.tone,
          format: a.brief.format,
        }
      : undefined,
  };
}

export async function loadSessionDetail(s: GenerationSession) {
  const [tailored, cover, chat, brief] = await Promise.all([
    TailoredResume.findOne({ where: { sessionId: s.id } }),
    CoverLetter.findOne({ where: { sessionId: s.id } }),
    ChatMessage.findAll({
      where: { sessionId: s.id },
      order: [["createdAt", "ASC"]],
    }),
    InterviewBrief.findOne({ where: { sessionId: s.id } }),
  ]);
  return serializeSession(s, { tailored, cover, chat, brief });
}

/** Batch-loads artifacts for the whole list in 4 queries (no N+1). */
export async function serializeList(sessions: GenerationSession[]) {
  if (sessions.length === 0) return [];
  const ids = sessions.map((s) => s.id);
  const where = { sessionId: { [Op.in]: ids } };
  const [tailored, cover, chat, brief] = await Promise.all([
    TailoredResume.findAll({ where }),
    CoverLetter.findAll({ where }),
    ChatMessage.findAll({ where, order: [["createdAt", "ASC"]] }),
    InterviewBrief.findAll({ where }),
  ]);
  const tMap = new Map(tailored.map((r) => [r.sessionId, r]));
  const cMap = new Map(cover.map((r) => [r.sessionId, r]));
  const bMap = new Map(brief.map((r) => [r.sessionId, r]));
  const chatMap = new Map<string, ChatMessage[]>();
  for (const m of chat) {
    const arr = chatMap.get(m.sessionId) ?? [];
    arr.push(m);
    chatMap.set(m.sessionId, arr);
  }
  return sessions.map((s) =>
    serializeSession(s, {
      tailored: tMap.get(s.id),
      cover: cMap.get(s.id),
      chat: chatMap.get(s.id) ?? [],
      brief: bMap.get(s.id),
    }),
  );
}
