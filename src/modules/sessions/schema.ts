import { z } from "zod";

export const createSessionSchema = z.object({
  company: z.string().trim().max(200).optional(),
  role: z.string().trim().max(200).optional(),
  jobUrl: z.string().optional(),
  jobDescription: z.string().trim().min(1, "Paste the job description"),
  modelId: z.string().optional(),
  templateId: z.string().optional(),
});

export const patchSessionSchema = z.object({ status: z.enum(["active", "archived"]) });
export const modelSchema = z.object({ modelId: z.string().min(1) });
export const templateSchema = z.object({ templateId: z.string().min(1) });
export const chatSchema = z.object({ question: z.string().trim().min(1).max(2000) });
export const coverSchema = z.object({ tone: z.string().optional() });
export const briefSchema = z.object({
  type: z.enum(["recruiter-screen", "behavioral", "technical", "system-design", "mixed"]),
  tone: z.enum(["professional", "conversational", "creative"]),
  format: z.enum(["md", "docx", "pdf", "txt"]),
});
