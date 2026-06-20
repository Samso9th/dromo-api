import { createHash, randomBytes } from "crypto";

export const sha256 = (input: string): string =>
  createHash("sha256").update(input).digest("hex");

export const randomToken = (bytes = 32): string => randomBytes(bytes).toString("hex");
