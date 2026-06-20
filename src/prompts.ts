import type { ChatMessage } from "@/services/openrouter";
import type {
  InterviewTone,
  InterviewType,
  MasterResumeData,
  TailoredResumeData,
} from "@/types";

/* ── Tailored resume ── */
const TAILOR_SYS = `You are an expert resume writer. Given a candidate's MASTER RESUME (JSON) and a JOB DESCRIPTION, produce a tailored resume as a JSON object.

Rules:
- Fit the job EXACTLY. Add skills the job requires to the "skills" array (even if absent from the master), and drop skills irrelevant to this job.
- Rewrite work/project bullets to foreground the experience and keywords this job cares about. Keep them truthful — do NOT invent employers, titles, dates, or fabricate accomplishments.
- Keep it concise and ATS-friendly. Order the strongest, most relevant items first. Max ~6 bullets per role.
- Return ONLY a JSON object with the SAME shape as the master resume (header, summary, skills[], workExperience[], projects[], extracurriculars[], education[], certifications[]), PLUS:
    "matchedSkills": string[]  — skills you added or emphasized because the job requires them
    "removedSkills": string[]  — master skills you dropped as irrelevant
- Do not wrap the JSON in markdown fences. Output JSON only.`;

export function tailorMessages(master: MasterResumeData, jobDescription: string): ChatMessage[] {
  return [
    { role: "system", content: TAILOR_SYS },
    {
      role: "user",
      content: `MASTER RESUME (JSON):\n${JSON.stringify(master)}\n\nJOB DESCRIPTION:\n${jobDescription}\n\nReturn the tailored resume as a JSON object.`,
    },
  ];
}

/* ── Cover letter ── */
export function coverMessages(
  tailored: TailoredResumeData,
  jobDescription: string,
  tone: string,
): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You write concise, specific cover letters in a ${tone} tone. Reference the candidate's tailored resume and the job. 3 short paragraphs max, no clichés, no fabrication. Return ONLY a JSON object: {"greeting": string, "body": string, "closing": string, "signature": string}. "body" may contain \\n\\n between paragraphs. No markdown fences.`,
    },
    {
      role: "user",
      content: `TAILORED RESUME (JSON):\n${JSON.stringify(tailored)}\n\nJOB DESCRIPTION:\n${jobDescription}\n\nWrite the cover letter as JSON.`,
    },
  ];
}

/* ── Q&A assistant ── */
export function qaMessages(
  tailored: TailoredResumeData,
  jobDescription: string,
  history: { role: "user" | "assistant"; content: string }[],
  question: string,
): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You answer job-application questions AS the candidate, grounded ONLY in their tailored resume and this job description. Be specific, first-person, concise (3-5 sentences for application boxes), and tie answers to concrete outcomes. Never fabricate facts not supported by the resume.\n\nTAILORED RESUME (JSON):\n${JSON.stringify(tailored)}\n\nJOB DESCRIPTION:\n${jobDescription}`,
    },
    ...history.map((m) => ({ role: m.role, content: m.content }) as ChatMessage),
    { role: "user", content: question },
  ];
}

/* ── Interview brief ── */
export function briefMessages(
  tailored: TailoredResumeData,
  jobDescription: string,
  type: InterviewType,
  tone: InterviewTone,
): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You produce a self-contained interview-prep brief in Markdown, meant to be fed to an AI mock-interviewer as context. Interview type: ${type}. Tone: ${tone}.

Include these sections:
# Interview Brief — <role> at <company>
## Role & company summary
## Candidate highlights (from the tailored resume)
## Likely questions (grouped, specific to the ${type} interview)
## Strong model answers (use STAR for behavioral)
## Talking points to weave in
## Gaps / red flags to pre-empt

Be concrete and grounded in the resume + job. Output Markdown only (no code fences around the whole thing).`,
    },
    {
      role: "user",
      content: `TAILORED RESUME (JSON):\n${JSON.stringify(tailored)}\n\nJOB DESCRIPTION:\n${jobDescription}\n\nWrite the interview brief in Markdown.`,
    },
  ];
}
