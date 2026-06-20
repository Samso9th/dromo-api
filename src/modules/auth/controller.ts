import type { Request } from "express";
import { asyncHandler, badRequest } from "@/utils/app-error";
import { REFRESH_COOKIE } from "@/utils/cookies";
import * as authService from "@/services/auth.service";
import { serializeUser } from "@/services/auth.service";
import { reqUser } from "@/utils/req-user";

const meta = (req: Request): authService.SessionMeta => ({
  userAgent: req.headers["user-agent"] ?? null,
  ip: req.ip ?? null,
});

export const signup = asyncHandler(async (req, res) => {
  const user = await authService.signup(req.body, res, meta(req));
  res.status(201).json({ user });
});

export const login = asyncHandler(async (req, res) => {
  const user = await authService.login(req.body, res, meta(req));
  res.json({ user });
});

export const refresh = asyncHandler(async (req, res) => {
  const user = await authService.refresh(
    req.cookies?.[REFRESH_COOKIE],
    res,
    meta(req),
  );
  res.json({ user });
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.cookies?.[REFRESH_COOKIE], res);
  res.json({ ok: true });
});

export const me = asyncHandler(async (req, res) => {
  const user = await serializeUser(reqUser(req));
  res.json({ user });
});

export const startMagicLink = asyncHandler(async (req, res) => {
  await authService.startMagicLink(req.body.email);
  res.json({ ok: true });
});

export const verifyMagicLink = asyncHandler(async (req, res) => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  if (!token) throw badRequest("Missing token");
  await authService.verifyMagicLink(token, res, meta(req));
  res.redirect(`${process.env.APP_URL ?? "http://localhost:8080"}/dashboard`);
});
