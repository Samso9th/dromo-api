import { ChatMessage, GenerationSession } from "@/models";
import { badRequest, forbidden } from "@/utils/app-error";
import {
  CONCURRENT_LIMIT,
  QA_LIMIT,
  RETRY_LIMIT,
  modelUnlocked,
  planAtLeast,
  requiredPlanForTier,
} from "./credit-config";
import { templateMinPlan } from "@/constants/templates";
import type { ModelTier, Plan } from "@/types";

export function assertModelAllowed(
  tier: ModelTier,
  plan: Plan,
  name: string,
): void {
  if (!modelUnlocked(tier, plan)) {
    throw forbidden(
      `${name} requires the ${requiredPlanForTier(tier)} plan or higher`,
    );
  }
}

export function assertTemplateAllowed(templateId: string, plan: Plan): void {
  const min = templateMinPlan(templateId);
  if (!min) throw badRequest("Unknown resume template");
  if (!planAtLeast(plan, min))
    throw forbidden(`That template requires the ${min} plan or higher`);
}

/** Only call when the artifact already exists (i.e. this is a re-generation). */
export function assertRetryAvailable(retriesUsed: number, plan: Plan): void {
  const limit = RETRY_LIMIT[plan];
  if (retriesUsed >= limit) {
    throw forbidden(
      limit === 0
        ? "Regenerating isn't available on the Free plan — upgrade to regenerate."
        : `You've reached your ${limit} regeneration limit for this item.`,
    );
  }
}

export async function assertConcurrentAvailable(
  userId: string,
  plan: Plan,
): Promise<void> {
  const limit = CONCURRENT_LIMIT[plan];
  if (!Number.isFinite(limit)) return;
  const active = await GenerationSession.count({
    where: { userId, status: "active" },
  });
  if (active >= limit) {
    throw forbidden(
      `Free plan allows ${limit} active sessions. Archive or delete one to start another.`,
    );
  }
}

export async function assertQaAvailable(
  sessionId: string,
  plan: Plan,
): Promise<void> {
  const used = await ChatMessage.count({ where: { sessionId, role: "user" } });
  if (used >= QA_LIMIT[plan]) {
    throw forbidden(
      `You've used all ${QA_LIMIT[plan]} Q&A questions for this session.`,
    );
  }
}
