import type { GenAction, ModelTier, Plan } from "@/types";

/**
 * Credit math + plan limits — the single server-side source of truth.
 * Mirrors ui/src/lib/credits.ts and docs/monetization.md.
 */

export const MARKUP = 5; // 5× over raw OpenRouter cost (~80% gross margin)
export const CREDIT_USD = 0.01; // 1 credit = $0.01

/** Per-action token estimates (for pre-flight + picker badges) + the credit floor. */
export const ACTION_TOKENS: Record<
  GenAction,
  { in: number; out: number; floor: number }
> = {
  tailor: { in: 6000, out: 3000, floor: 2 },
  cover: { in: 4000, out: 1000, floor: 2 },
  qa: { in: 3000, out: 400, floor: 1 },
  brief: { in: 5000, out: 3000, floor: 2 },
  parse: { in: 4000, out: 1500, floor: 1 },
};

/** credits = max(floor, ceil(rawUsd × MARKUP / CREDIT_USD)). */
export function creditsForRaw(rawUsd: number, action: GenAction): number {
  return Math.max(
    ACTION_TOKENS[action].floor,
    Math.ceil((rawUsd * MARKUP) / CREDIT_USD),
  );
}

/** Estimate from per-action token estimates. `inputPrice`/`outputPrice` are USD per token. */
export function estimateCredits(
  pricing: { inputPrice: number | string; outputPrice: number | string },
  action: GenAction,
): number {
  const t = ACTION_TOKENS[action];
  const raw =
    Number(pricing.inputPrice) * t.in + Number(pricing.outputPrice) * t.out;
  return creditsForRaw(raw, action);
}

/* ── Plan gating + limits ─────────────────────────────────────── */

const TIER_RANK: Record<ModelTier, number> = {
  economy: 0,
  standard: 1,
  premium: 2,
};
const PLAN_RANK: Record<Plan, number> = { free: 0, pro: 1, premium: 2 };

export function modelUnlocked(tier: ModelTier, plan: Plan): boolean {
  return TIER_RANK[tier] <= PLAN_RANK[plan];
}
export function planAtLeast(plan: Plan, min: Plan): boolean {
  return PLAN_RANK[plan] >= PLAN_RANK[min];
}
export function requiredPlanForTier(tier: ModelTier): Plan {
  return tier === "economy" ? "free" : tier === "standard" ? "pro" : "premium";
}

/** Max Q&A questions per session. */
export const QA_LIMIT: Record<Plan, number> = { free: 3, pro: 10, premium: 20 };
/** Max regenerations per artifact per session (initial generation is free). */
export const RETRY_LIMIT: Record<Plan, number> = {
  free: 0,
  pro: 2,
  premium: 5,
};
/** Max concurrent active sessions (Infinity = unlimited). */
export const CONCURRENT_LIMIT: Record<Plan, number> = {
  free: 3,
  pro: Infinity,
  premium: Infinity,
};
