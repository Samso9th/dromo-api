import jwt from "jsonwebtoken";
import { env } from "@/config/env";
import type { Plan } from "@/types";

export interface AccessPayload {
  sub: string;
  plan: Plan;
}

export const ACCESS_TTL_S = 60 * 15; // 15 minutes
export const REFRESH_TTL_S = 60 * 60 * 24 * 30; // 30 days

export const signAccess = (payload: AccessPayload): string =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_TTL_S });

export const verifyAccess = (token: string): AccessPayload =>
  jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
