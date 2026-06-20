import { ModelPricing } from "@/models";
import { fetchModels } from "./openrouter";
import { logger } from "@/config/logger";
import { notFound } from "@/utils/app-error";

/** Refresh input/output price + context for our curated, enabled models from OpenRouter. */
export async function refreshPricing(): Promise<number> {
  const live = await fetchModels();
  const byId = new Map(live.map((m) => [m.id, m]));
  const ours = await ModelPricing.findAll();
  let updated = 0;
  for (const row of ours) {
    const m = byId.get(row.id);
    if (!m?.pricing) continue;
    const input = parseFloat(m.pricing.prompt);
    const output = parseFloat(m.pricing.completion);
    if (!Number.isFinite(input) || !Number.isFinite(output)) continue;
    row.inputPrice = input;
    row.outputPrice = output;
    if (m.context_length) row.contextLength = m.context_length;
    row.refreshedAt = new Date();
    await row.save();
    updated++;
  }
  logger.info(`Model pricing refreshed: ${updated}/${ours.length} models from OpenRouter`);
  return updated;
}

export async function listEnabledModels(): Promise<ModelPricing[]> {
  return ModelPricing.findAll({ where: { enabled: true }, order: [["outputPrice", "ASC"]] });
}

export async function getModelOrThrow(id: string): Promise<ModelPricing> {
  const model = await ModelPricing.findByPk(id);
  if (!model || !model.enabled) throw notFound("That model isn't available");
  return model;
}

/** Serialize to the frontend AiModel shape (pricing in $ per MILLION tokens). */
export function serializeModel(m: ModelPricing) {
  const perMillion = (v: number | string) => Number((Number(v) * 1_000_000).toFixed(6));
  return {
    id: m.id,
    name: m.name,
    note: m.note,
    tier: m.tier,
    pricing: { in: perMillion(m.inputPrice), out: perMillion(m.outputPrice) },
  };
}
