import { UsageEvent, sequelize, type ModelPricing } from "@/models";
import { applyCredits, getBalance } from "./credits.service";
import { creditsForRaw, estimateCredits } from "./credit-config";
import { insufficientCredits } from "@/utils/app-error";
import type { GenAction } from "@/types";

const ACTION_LABEL: Record<GenAction, string> = {
  tailor: "Tailored resume",
  cover: "Cover letter",
  qa: "Q&A answer",
  brief: "Interview brief",
  parse: "Resume parse",
};

export interface ChargeResult<T> {
  result: T;
  creditsCharged: number;
  balance: number;
  usageEventId: string;
}

/**
 * The money path. Pre-flights the balance against an estimate, runs the AI call, then charges the
 * user for the ACTUAL tokens used — usage event + ledger spend + balance, all in one transaction.
 * Callers enforce plan/retry/QA/concurrent guards before invoking this.
 */
export async function chargeAndRun<T>(params: {
  userId: string;
  sessionId: string | null;
  action: GenAction;
  model: ModelPricing;
  run: () => Promise<{ result: T; usage: { promptTokens: number; completionTokens: number } }>;
}): Promise<ChargeResult<T>> {
  const { userId, sessionId, action, model, run } = params;

  // 1. Pre-flight against an estimate (never block mid-generation).
  const { balance } = await getBalance(userId);
  const estimate = estimateCredits(model, action);
  if (balance < estimate) {
    throw insufficientCredits(
      `This needs about ${estimate} credits and you have ${balance}. Top up or pick a cheaper model.`,
    );
  }

  // 2. Run the AI call → actual token usage.
  const { result, usage } = await run();
  const rawUsd =
    Number(model.inputPrice) * usage.promptTokens + Number(model.outputPrice) * usage.completionTokens;
  const creditsCharged = creditsForRaw(rawUsd, action);

  // 3. Record usage + charge, atomically.
  const out = await sequelize.transaction(async (t) => {
    const event = await UsageEvent.create(
      {
        userId,
        sessionId,
        action,
        modelId: model.id,
        inputTokens: usage.promptTokens,
        outputTokens: usage.completionTokens,
        rawCostUsd: rawUsd,
        creditsCharged,
      },
      { transaction: t },
    );
    const newBalance = await applyCredits(
      userId,
      -creditsCharged,
      {
        kind: "spend",
        description: `${ACTION_LABEL[action]} · ${model.name}`,
        refType: "usage",
        refId: event.id,
      },
      t,
    );
    return { usageEventId: event.id, balance: newBalance };
  });

  return { result, creditsCharged, balance: out.balance, usageEventId: out.usageEventId };
}
