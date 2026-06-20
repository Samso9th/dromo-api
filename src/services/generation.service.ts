import {
  ChatMessage,
  CoverLetter,
  GenerationSession,
  InterviewBrief,
  MasterResume,
  TailoredResume,
  type User,
} from "@/models";
import { chatCompletion } from "./openrouter";
import { chargeAndRun } from "./credit-engine";
import { getModelOrThrow } from "./pricing";
import { assertModelAllowed, assertQaAvailable, assertRetryAvailable } from "./limits.service";
import { briefMessages, coverMessages, qaMessages, tailorMessages } from "@/prompts";
import { coverLetterSchema, tailoredResumeSchema } from "@/validators/resume";
import { AppError, badRequest } from "@/utils/app-error";
import type {
  DocFormat,
  InterviewTone,
  InterviewType,
  Plan,
  TailoredResumeData,
} from "@/types";

/** Strip accidental ``` fences and parse JSON from a model response. */
function parseJson(content: string): unknown {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new AppError(502, "ai_bad_output", "The model returned malformed output. Try again.");
  }
}

async function getMaster(userId: string): Promise<MasterResume> {
  const master = await MasterResume.findOne({ where: { userId } });
  if (!master) throw badRequest("Upload your master resume before generating.");
  return master;
}

async function getTailored(sessionId: string): Promise<TailoredResume> {
  const tailored = await TailoredResume.findOne({ where: { sessionId } });
  if (!tailored) throw badRequest("Generate the tailored resume for this session first.");
  return tailored;
}

const plan = (user: User) => user.plan as Plan;

/* ── Tailor ── */
export async function runTailor(session: GenerationSession, user: User): Promise<TailoredResumeData> {
  const master = await getMaster(user.id);
  const model = await getModelOrThrow(session.modelId);
  assertModelAllowed(model.tier, plan(user), model.name);
  const existing = await TailoredResume.findOne({ where: { sessionId: session.id } });
  if (existing) assertRetryAvailable(session.retries.tailor, plan(user));

  const out = await chargeAndRun({
    userId: user.id,
    sessionId: session.id,
    action: "tailor",
    model,
    run: async () => {
      const { content, usage } = await chatCompletion({
        model: model.id,
        messages: tailorMessages(master.data, session.jobDescription),
        json: true,
        maxTokens: 4000,
      });
      const parsed = tailoredResumeSchema.parse(parseJson(content));
      return { result: parsed as TailoredResumeData, usage };
    },
  });

  if (existing) {
    existing.data = out.result;
    await existing.save();
    session.retries = { ...session.retries, tailor: session.retries.tailor + 1 };
    await session.save();
  } else {
    await TailoredResume.create({ sessionId: session.id, data: out.result });
  }
  return out.result;
}

/* ── Cover letter ── */
export async function runCover(session: GenerationSession, user: User, tone: string) {
  const tailored = await getTailored(session.id);
  const model = await getModelOrThrow(session.modelId);
  assertModelAllowed(model.tier, plan(user), model.name);
  const existing = await CoverLetter.findOne({ where: { sessionId: session.id } });
  if (existing) assertRetryAvailable(session.retries.cover, plan(user));

  const out = await chargeAndRun({
    userId: user.id,
    sessionId: session.id,
    action: "cover",
    model,
    run: async () => {
      const { content, usage } = await chatCompletion({
        model: model.id,
        messages: coverMessages(tailored.data as TailoredResumeData, session.jobDescription, tone),
        json: true,
        maxTokens: 1500,
      });
      return { result: coverLetterSchema.parse(parseJson(content)), usage };
    },
  });

  const fields = { ...out.result, tone };
  if (existing) {
    Object.assign(existing, fields);
    await existing.save();
    session.retries = { ...session.retries, cover: session.retries.cover + 1 };
    await session.save();
  } else {
    await CoverLetter.create({ sessionId: session.id, ...fields });
  }
  return out.result;
}

/* ── Q&A ── */
export async function runChat(session: GenerationSession, user: User, question: string) {
  await assertQaAvailable(session.id, plan(user));
  const tailored = await getTailored(session.id);
  const model = await getModelOrThrow(session.modelId);
  assertModelAllowed(model.tier, plan(user), model.name);
  const history = await ChatMessage.findAll({
    where: { sessionId: session.id },
    order: [["createdAt", "ASC"]],
  });

  const out = await chargeAndRun({
    userId: user.id,
    sessionId: session.id,
    action: "qa",
    model,
    run: async () => {
      const { content, usage } = await chatCompletion({
        model: model.id,
        messages: qaMessages(
          tailored.data as TailoredResumeData,
          session.jobDescription,
          history.map((m) => ({ role: m.role, content: m.content })),
          question,
        ),
        maxTokens: 800,
      });
      return { result: content.trim(), usage };
    },
  });

  await ChatMessage.create({ sessionId: session.id, role: "user", content: question });
  const assistant = await ChatMessage.create({
    sessionId: session.id,
    role: "assistant",
    content: out.result,
    modelId: model.id,
  });
  return {
    id: assistant.id,
    role: "assistant" as const,
    content: assistant.content,
    createdAt: assistant.createdAt,
  };
}

/* ── Interview brief ── */
export async function runBrief(
  session: GenerationSession,
  user: User,
  opts: { type: InterviewType; tone: InterviewTone; format: DocFormat },
) {
  const tailored = await getTailored(session.id);
  const model = await getModelOrThrow(session.modelId);
  assertModelAllowed(model.tier, plan(user), model.name);
  const existing = await InterviewBrief.findOne({ where: { sessionId: session.id } });
  if (existing) assertRetryAvailable(session.retries.brief, plan(user));

  const out = await chargeAndRun({
    userId: user.id,
    sessionId: session.id,
    action: "brief",
    model,
    run: async () => {
      const { content, usage } = await chatCompletion({
        model: model.id,
        messages: briefMessages(
          tailored.data as TailoredResumeData,
          session.jobDescription,
          opts.type,
          opts.tone,
        ),
        maxTokens: 3000,
      });
      return { result: content.trim(), usage };
    },
  });

  const fields = { content: out.result, type: opts.type, tone: opts.tone, format: opts.format };
  if (existing) {
    Object.assign(existing, fields);
    await existing.save();
    session.retries = { ...session.retries, brief: session.retries.brief + 1 };
    await session.save();
  } else {
    await InterviewBrief.create({ sessionId: session.id, ...fields });
  }
  return fields;
}
