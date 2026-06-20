// Shared domain types. The resume JSONB shapes mirror ui/src/lib/api/types.ts exactly.

export type Plan = "free" | "pro" | "premium";
export const PLANS: Plan[] = ["free", "pro", "premium"];

export type ModelTier = "economy" | "standard" | "premium";
export const MODEL_TIERS: ModelTier[] = ["economy", "standard", "premium"];

export type OAuthProvider = "google" | "github" | "linkedin";
export const OAUTH_PROVIDERS: OAuthProvider[] = ["google", "github", "linkedin"];

export type SessionStatus = "active" | "archived";
export type ChatRole = "user" | "assistant";
export type GenAction = "tailor" | "cover" | "qa" | "brief" | "parse";

export type InterviewType =
  | "recruiter-screen"
  | "behavioral"
  | "technical"
  | "system-design"
  | "mixed";
export type InterviewTone = "professional" | "conversational" | "creative";
export type DocFormat = "md" | "docx" | "pdf" | "txt";

export type CreditTxnKind = "grant" | "spend" | "topup" | "refund" | "adjustment";
export type CreditTxnRef = "usage" | "payment" | "subscription" | "signup" | "manual";
export type PaymentProvider = "stripe" | "dubu";
export type PaymentKind = "subscription" | "topup";
export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";
export type SubStatus = "active" | "past_due" | "canceled" | "incomplete";

export interface Period {
  start: string;
  end: string;
}
export interface ResumeHeader {
  name: string;
  location: string;
  email: string;
  phone: string;
  github?: string;
  linkedin?: string;
  website?: string;
}
export interface WorkExperience {
  company: string;
  companyUrl?: string;
  role: string;
  period: Period;
  locationType: "remote" | "hybrid" | "onsite";
  location?: string;
  bullets: string[];
}
export interface ProjectEntry {
  name: string;
  url?: string;
  period: Period;
  role?: string;
  location?: string;
  bullets: string[];
}
export interface ExtracurricularEntry {
  name: string;
  period: Period;
  role?: string;
  where: string;
  bullets: string[];
}
export interface EducationEntry {
  institution: string;
  course: string;
  period: Period;
  gpa?: string;
}
export interface CertificationEntry {
  name: string;
  details: string;
  awardedDate?: string;
}
export interface MasterResumeData {
  header: ResumeHeader;
  summary: string;
  skills: string[];
  workExperience: WorkExperience[];
  projects: ProjectEntry[];
  extracurriculars: ExtracurricularEntry[];
  education: EducationEntry[];
  certifications: CertificationEntry[];
  extraSections?: Array<{ title: string; items: Array<Record<string, unknown>> }>;
}
export interface TailoredResumeData extends MasterResumeData {
  matchedSkills: string[];
  removedSkills: string[];
}

export interface SessionRetries {
  tailor: number;
  cover: number;
  brief: number;
}
