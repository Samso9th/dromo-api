import type { Plan } from "@/types";

/** Resume templates mirror ui/src/lib/templates.ts. Gating is by plan. Frontend owns rendering. */
export const TEMPLATES: { id: string; minPlan: Plan }[] = [
  { id: "classic", minPlan: "free" },
  { id: "modern", minPlan: "free" },
  { id: "compact", minPlan: "free" },
  { id: "two-column", minPlan: "pro" },
  { id: "editorial", minPlan: "premium" },
];

export const DEFAULT_TEMPLATE_ID = "classic";
export const DEFAULT_MODEL_ID = "qwen/qwen3-235b-a22b-2507"; // cheapest economy model

export const templateMinPlan = (id: string): Plan | undefined =>
  TEMPLATES.find((t) => t.id === id)?.minPlan;
