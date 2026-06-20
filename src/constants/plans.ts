import type { Plan } from "@/types";

/** Paid plans (mirrors ui/src/lib/billing.ts + docs/monetization.md). */
export const PLAN_CONFIG: Record<
  "pro" | "premium",
  { priceUsd: number; credits: number; label: string }
> = {
  pro: { priceUsd: 9.99, credits: 1500, label: "Dromo Pro (monthly)" },
  premium: { priceUsd: 29.99, credits: 5000, label: "Dromo Premium (monthly)" },
};

export const CREDIT_PACKS: { credits: number; priceUsd: number }[] = [
  { credits: 100, priceUsd: 0.99 },
  { credits: 1000, priceUsd: 9.49 },
  { credits: 5000, priceUsd: 44.99 },
  { credits: 15000, priceUsd: 124.99 },
];

export function isPaidPlan(p: string): p is "pro" | "premium" {
  return p === "pro" || p === "premium";
}

/** Resolve a checkout request into a concrete amount + credit grant. */
export function resolveCheckout(input: {
  kind: "subscription" | "topup";
  planId?: Plan;
  credits?: number;
}): { amountUsd: number; credits: number; label: string } {
  if (input.kind === "subscription") {
    if (!input.planId || !isPaidPlan(input.planId)) {
      throw new Error(
        "A valid plan (pro|premium) is required for a subscription",
      );
    }
    const cfg = PLAN_CONFIG[input.planId];
    return { amountUsd: cfg.priceUsd, credits: cfg.credits, label: cfg.label };
  }
  const pack = CREDIT_PACKS.find((p) => p.credits === input.credits);
  if (!pack) throw new Error("Unknown credit pack");
  return {
    amountUsd: pack.priceUsd,
    credits: pack.credits,
    label: `${pack.credits.toLocaleString()} Dromo credits`,
  };
}
