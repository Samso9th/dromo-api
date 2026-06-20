"use strict";

/** Curated model allowlist. Prices are USD per token ($/M ÷ 1e6). A cron later refreshes
 *  input/output price from OpenRouter /models; tier/note/enabled stay curated here. */
const M = 1_000_000;
const models = [
  ["qwen/qwen3-235b-a22b-2507", "Qwen3 235B", "Fast & economical", "economy", 0.09, 0.1, 262144],
  ["deepseek/deepseek-chat", "DeepSeek V3", "Great all-round value", "economy", 0.2, 0.8, 163840],
  ["meta-llama/llama-3.3-70b-instruct", "Llama 3.3 70B", "Open & cheap", "economy", 0.1, 0.32, 131072],
  ["google/gemini-2.5-flash", "Gemini 2.5 Flash", "Quick and capable", "economy", 0.3, 2.5, 1048576],
  ["google/gemini-2.5-pro", "Gemini 2.5 Pro", "Strong reasoning", "standard", 1.25, 10, 1048576],
  ["openai/gpt-4o", "GPT-4o", "Well-rounded", "standard", 2.5, 10, 128000],
  ["openai/gpt-4.1", "GPT-4.1", "Precise & reliable", "standard", 2, 8, 1047576],
  ["anthropic/claude-sonnet-4.5", "Claude Sonnet 4.5", "Excellent writing", "standard", 3, 15, 200000],
  ["anthropic/claude-opus-4.5", "Claude Opus 4.5", "Top quality", "premium", 5, 25, 200000],
  ["anthropic/claude-opus-4.8-fast", "Claude Opus 4.8 Fast", "Best & fastest", "premium", 10, 50, 200000],
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert(
      "model_pricing",
      models.map(([id, name, note, tier, inM, outM, ctx]) => ({
        id,
        name,
        note,
        tier,
        input_price: inM / M,
        output_price: outM / M,
        context_length: ctx,
        enabled: true,
        refreshed_at: now,
        created_at: now,
        updated_at: now,
      })),
      {},
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("model_pricing", {}, {});
  },
};
