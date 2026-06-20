import { AppError } from "@/utils/app-error";

/** Strip accidental ``` fences and parse JSON from a model response. */
export function parseJson(content: string): unknown {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new AppError(502, "ai_bad_output", "The model returned malformed output. Try again.");
  }
}
