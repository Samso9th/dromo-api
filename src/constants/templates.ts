import type { Plan } from "@/types";

/** Resume templates mirror ui/src/lib/templates.ts — config drives server-side PDF rendering. */
export type SectionKey =
  | "summary"
  | "skills"
  | "work"
  | "projects"
  | "extracurriculars"
  | "education"
  | "certifications";

export interface TemplateConfig {
  id: string;
  minPlan: Plan;
  font: "serif" | "sans";
  nameAlign: "center" | "left";
  nameSize: number;
  nameUppercase?: boolean;
  heading: "caps-rule" | "plain-bold" | "caps-plain";
  density: "normal" | "compact" | "airy";
  columns: 1 | 2;
  sidebar?: SectionKey[];
}

export const RESUME_TEMPLATES: TemplateConfig[] = [
  { id: "classic", minPlan: "free", font: "serif", nameAlign: "center", nameSize: 30, heading: "caps-rule", density: "normal", columns: 1 },
  { id: "modern", minPlan: "free", font: "sans", nameAlign: "left", nameSize: 27, heading: "plain-bold", density: "normal", columns: 1 },
  { id: "compact", minPlan: "free", font: "serif", nameAlign: "center", nameSize: 24, heading: "caps-rule", density: "compact", columns: 1 },
  {
    id: "two-column",
    minPlan: "pro",
    font: "sans",
    nameAlign: "left",
    nameSize: 26,
    heading: "caps-plain",
    density: "normal",
    columns: 2,
    sidebar: ["skills", "education", "certifications"],
  },
  { id: "editorial", minPlan: "premium", font: "serif", nameAlign: "center", nameSize: 34, nameUppercase: true, heading: "caps-rule", density: "airy", columns: 1 },
];

export const TEMPLATES = RESUME_TEMPLATES.map((t) => ({ id: t.id, minPlan: t.minPlan }));
export const DEFAULT_TEMPLATE_ID = "classic";
export const DEFAULT_MODEL_ID = "qwen/qwen3-235b-a22b-2507";

export const templateMinPlan = (id: string): Plan | undefined =>
  RESUME_TEMPLATES.find((t) => t.id === id)?.minPlan;

export const getTemplateConfig = (id: string): TemplateConfig =>
  RESUME_TEMPLATES.find((t) => t.id === id) ?? RESUME_TEMPLATES[0];
