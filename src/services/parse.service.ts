import pdfParse from "pdf-parse/lib/pdf-parse.js";
import mammoth from "mammoth";
import { cloudinary, cloudinaryEnabled } from "@/config/cloudinary";
import { logger } from "@/config/logger";
import { MasterResume, type User } from "@/models";
import { chatCompletion } from "./openrouter";
import { chargeAndRun } from "./credit-engine";
import { getModelOrThrow } from "./pricing";
import { masterResumeSchema } from "@/validators/resume";
import { parseJson } from "@/utils/parse-json";
import { DEFAULT_MODEL_ID } from "@/constants/templates";
import { badRequest } from "@/utils/app-error";
import type { MasterResumeData } from "@/types";

export interface UploadedFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

async function extractText(file: UploadedFile): Promise<string> {
  const name = file.originalname.toLowerCase();
  const isPdf = file.mimetype.includes("pdf") || name.endsWith(".pdf");
  const isDocx =
    file.mimetype.includes("word") ||
    file.mimetype.includes("officedocument") ||
    name.endsWith(".docx");
  if (isPdf) return (await pdfParse(file.buffer)).text;
  if (isDocx)
    return (await mammoth.extractRawText({ buffer: file.buffer })).value;
  throw badRequest("Please upload a PDF or DOCX file");
}

const PARSE_SYS = `You convert raw resume text into a structured JSON object. Extract everything faithfully and do NOT invent anything.

Return ONLY this JSON shape (no markdown fences):
{
  "header": {"name","location","email","phone","github?","linkedin?","website?"},
  "summary": string,
  "skills": string[],
  "workExperience": [{"company","companyUrl?","role","period":{"start","end"},"locationType":"remote"|"hybrid"|"onsite","location?","bullets":string[]}],
  "projects": [{"name","url?","period":{"start","end"},"role?","location?","bullets":string[]}],
  "extracurriculars": [{"name","period":{"start","end"},"role?","where","bullets":string[]}],
  "education": [{"institution","course","period":{"start","end"},"gpa?"}],
  "certifications": [{"name","details","awardedDate?"}]
}
Use dates like "Jan 2022" or "2022". Use "Present" for ongoing roles. Omit fields you can't find.`;

async function uploadFile(file: UploadedFile): Promise<string | null> {
  if (!cloudinaryEnabled) return null;
  try {
    const dataUri = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
    const res = await cloudinary.uploader.upload(dataUri, {
      resource_type: "raw",
      folder: "dromo/resumes",
    });
    return res.secure_url;
  } catch (err) {
    logger.warn(`Cloudinary upload failed: ${(err as Error).message}`);
    return null;
  }
}

/** Upload a resume file → extract text → AI-parse to master JSON (charged) → persist. */
export async function uploadAndParseMaster(
  user: User,
  file: UploadedFile,
): Promise<MasterResumeData> {
  const text = await extractText(file);
  if (text.trim().length < 40) {
    throw badRequest(
      "Couldn't read enough text from that file. Is it a text-based PDF?",
    );
  }

  const model = await getModelOrThrow(DEFAULT_MODEL_ID);
  const out = await chargeAndRun({
    userId: user.id,
    sessionId: null,
    action: "parse",
    model,
    run: async () => {
      const { content, usage } = await chatCompletion({
        model: model.id,
        messages: [
          { role: "system", content: PARSE_SYS },
          {
            role: "user",
            content: `RESUME TEXT:\n${text.slice(0, 40000)}\n\nReturn the COMPLETE structured JSON — include every section, especially education and certifications.`,
          },
        ],
        json: true,
        maxTokens: 8000,
      });
      return {
        result: masterResumeSchema.parse(
          parseJson(content),
        ) as MasterResumeData,
        usage,
      };
    },
  });

  const sourceFileUrl = await uploadFile(file);
  const existing = await MasterResume.findOne({ where: { userId: user.id } });
  if (existing) {
    existing.data = out.result;
    existing.sourceFileUrl = sourceFileUrl;
    existing.parsedAt = new Date();
    await existing.save();
  } else {
    await MasterResume.create({
      userId: user.id,
      data: out.result,
      sourceFileUrl,
      parsedAt: new Date(),
    });
  }
  return out.result;
}
