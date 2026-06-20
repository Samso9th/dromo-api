import type { CookieOptions, Response } from "express";
import { env, isProd } from "@/config/env";
import { ACCESS_TTL_S, REFRESH_TTL_S } from "./jwt";

export const ACCESS_COOKIE = "dromo_at";
export const REFRESH_COOKIE = "dromo_rt";

const base: CookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax",
  domain: env.COOKIE_DOMAIN,
  path: "/",
};

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
): void {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...base,
    maxAge: ACCESS_TTL_S * 1000,
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...base,
    maxAge: REFRESH_TTL_S * 1000,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, base);
  res.clearCookie(REFRESH_COOKIE, base);
}
