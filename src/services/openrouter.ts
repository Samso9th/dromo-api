import { env } from "@/config/env";
import { AppError } from "@/utils/app-error";

const BASE = "https://openrouter.ai/api/v1";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
export interface ChatUsage {
  promptTokens: number;
  completionTokens: number;
}
export interface ChatResult {
  content: string;
  usage: ChatUsage;
}

/** One chat completion. Returns the text + actual token usage (used to bill). */
export async function chatCompletion(opts: {
  model: string;
  messages: ChatMessage[];
  json?: boolean; // request a JSON object response
  temperature?: number;
  maxTokens?: number;
}): Promise<ChatResult> {
  if (!env.OPENROUTER_API_KEY) {
    throw new AppError(503, "ai_unavailable", "OPENROUTER_API_KEY is not configured");
  }
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": env.APP_URL,
      "X-Title": "Dromo",
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.4,
      ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    throw new AppError(502, "ai_error", `OpenRouter ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  return {
    content: data.choices?.[0]?.message?.content ?? "",
    usage: {
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
    },
  };
}

export interface ORModel {
  id: string;
  pricing?: { prompt: string; completion: string };
  context_length?: number;
}

/** Fetch the model catalog (public; pricing in $/token as strings). */
export async function fetchModels(): Promise<ORModel[]> {
  const res = await fetch(`${BASE}/models`, {
    headers: env.OPENROUTER_API_KEY ? { Authorization: `Bearer ${env.OPENROUTER_API_KEY}` } : {},
  });
  if (!res.ok) throw new AppError(502, "ai_error", `OpenRouter /models ${res.status}`);
  const data = (await res.json()) as { data?: ORModel[] };
  return data.data ?? [];
}
