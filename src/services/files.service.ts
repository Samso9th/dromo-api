import {
  CoverLetter,
  GenerationSession,
  InterviewBrief,
  TailoredResume,
} from "@/models";
import { coverHtml, markdownHtml, resumeHtml } from "./resume-html";
import { resumeDocxBuffer, textDocxBuffer } from "./resume-docx";
import { htmlToPdf } from "./pdf.service";
import { badRequest, notFound } from "@/utils/app-error";
import type { DocFormat, TailoredResumeData } from "@/types";

export type FileKind = "resume" | "cover-letter" | "interview-brief";
export interface FileResult {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

const CT: Record<DocFormat, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain; charset=utf-8",
  md: "text/markdown; charset=utf-8",
};

const stripMarkdown = (md: string): string =>
  md
    .replace(/^#{1,6}\s/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1");

export async function buildFile(
  session: GenerationSession,
  kind: FileKind,
  format: DocFormat,
): Promise<FileResult> {
  const part = (s: string) =>
    (s || "")
      .trim()
      .replace(/[^\w]+/g, "_")
      .replace(/^_+|_+$/g, "");
  const role = part(session.role) || "Role";
  const safe = part(session.company) || "dromo";

  if (kind === "resume") {
    const t = await TailoredResume.findOne({
      where: { sessionId: session.id },
    });
    if (!t) throw notFound("No tailored resume yet — generate it first");
    const data = t.data as TailoredResumeData;
    const base = `${part(data.header?.name) || "Resume"}_${role}`; // FullName_Role
    if (format === "pdf")
      return {
        buffer: await htmlToPdf(resumeHtml(data, session.templateId)),
        contentType: CT.pdf,
        filename: `${base}.pdf`,
      };
    if (format === "docx")
      return {
        buffer: await resumeDocxBuffer(data),
        contentType: CT.docx,
        filename: `${base}.docx`,
      };
    throw badRequest("Resume supports pdf or docx");
  }

  if (kind === "cover-letter") {
    const c = await CoverLetter.findOne({ where: { sessionId: session.id } });
    if (!c) throw notFound("No cover letter yet — generate it first");
    const text = `${c.greeting}\n\n${c.body}\n\n${c.closing}\n\n${c.signature}`;
    if (format === "pdf")
      return {
        buffer: await htmlToPdf(coverHtml(c)),
        contentType: CT.pdf,
        filename: `${safe}_CoverLetter.pdf`,
      };
    if (format === "docx")
      return {
        buffer: await textDocxBuffer([
          c.greeting,
          ...c.body.split(/\n{2,}/),
          c.closing,
          c.signature,
        ]),
        contentType: CT.docx,
        filename: `${safe}_CoverLetter.docx`,
      };
    if (format === "txt")
      return {
        buffer: Buffer.from(text, "utf8"),
        contentType: CT.txt,
        filename: `${safe}_CoverLetter.txt`,
      };
    throw badRequest("Cover letter supports pdf, docx, or txt");
  }

  // interview-brief
  const b = await InterviewBrief.findOne({ where: { sessionId: session.id } });
  if (!b) throw notFound("No interview brief yet — generate it first");
  if (format === "pdf")
    return {
      buffer: await htmlToPdf(markdownHtml(b.content)),
      contentType: CT.pdf,
      filename: `${safe}_InterviewBrief.pdf`,
    };
  if (format === "md")
    return {
      buffer: Buffer.from(b.content, "utf8"),
      contentType: CT.md,
      filename: `${safe}_InterviewBrief.md`,
    };
  if (format === "txt")
    return {
      buffer: Buffer.from(stripMarkdown(b.content), "utf8"),
      contentType: CT.txt,
      filename: `${safe}_InterviewBrief.txt`,
    };
  if (format === "docx")
    return {
      buffer: await textDocxBuffer(b.content.split(/\n{2,}/).filter(Boolean)),
      contentType: CT.docx,
      filename: `${safe}_InterviewBrief.docx`,
    };
  throw badRequest("Brief supports pdf, md, txt, or docx");
}
