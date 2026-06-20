import { z } from "zod";

// Forgiving schemas — used to validate PUT /resume/master AND AI-generated tailored resumes.
// Defaults keep minor model omissions from failing the whole parse.

const str = z.string().default("");
const optStr = z.string().optional();
const period = z
  .object({ start: str, end: str })
  .default({ start: "", end: "" });

const header = z.object({
  name: str,
  location: str,
  email: str,
  phone: str,
  github: optStr,
  linkedin: optStr,
  website: optStr,
});

const work = z.object({
  company: str,
  companyUrl: optStr,
  role: str,
  period,
  locationType: z.enum(["remote", "hybrid", "onsite"]).catch("onsite"),
  location: optStr,
  bullets: z.array(z.string()).default([]),
});

const project = z.object({
  name: str,
  url: optStr,
  period,
  role: optStr,
  location: optStr,
  bullets: z.array(z.string()).default([]),
});

const extracurricular = z.object({
  name: str,
  period,
  role: optStr,
  where: str,
  bullets: z.array(z.string()).default([]),
});

const education = z.object({
  institution: str,
  course: str,
  period,
  gpa: optStr,
});

const certification = z.object({
  name: str,
  details: str,
  awardedDate: optStr,
});

export const masterResumeSchema = z.object({
  header,
  summary: str,
  skills: z.array(z.string()).default([]),
  workExperience: z.array(work).default([]),
  projects: z.array(project).default([]),
  extracurriculars: z.array(extracurricular).default([]),
  education: z.array(education).default([]),
  certifications: z.array(certification).default([]),
  extraSections: z
    .array(
      z.object({ title: z.string(), items: z.array(z.record(z.unknown())) }),
    )
    .optional(),
});

export const tailoredResumeSchema = masterResumeSchema.extend({
  matchedSkills: z.array(z.string()).default([]),
  removedSkills: z.array(z.string()).default([]),
});

export const coverLetterSchema = z.object({
  greeting: str,
  body: str,
  closing: str,
  signature: str,
});
