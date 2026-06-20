import type { Response } from "express";
import { MasterResume, OAuthAccount, RefreshToken, User, sequelize } from "@/models";
import { hashPassword, verifyPassword } from "@/utils/password";
import { signAccess, REFRESH_TTL_S } from "@/utils/jwt";
import { sha256, randomToken } from "@/utils/crypto";
import { setAuthCookies, clearAuthCookies, REFRESH_COOKIE } from "@/utils/cookies";
import { redis } from "@/config/redis";
import { env } from "@/config/env";
import { badRequest, unauthorized } from "@/utils/app-error";
import { applyCredits, SIGNUP_CREDITS } from "./credits.service";
import { sendMagicLink } from "./email.service";
import type { OAuthProvider, Plan } from "@/types";

export interface SessionMeta {
  userAgent: string | null;
  ip: string | null;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  hasMasterResume: boolean;
  plan: Plan;
  credits: number;
}

export async function serializeUser(user: User): Promise<PublicUser> {
  const hasMasterResume = (await MasterResume.count({ where: { userId: user.id } })) > 0;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    hasMasterResume,
    plan: user.plan,
    credits: user.credits,
  };
}

/** Create a new user with the signup credit grant, in one transaction. */
async function createUserWithGrant(fields: {
  name: string;
  email: string;
  passwordHash?: string | null;
  emailVerified?: boolean;
  avatarUrl?: string | null;
}): Promise<User> {
  const user = await sequelize.transaction(async (t) => {
    const u = await User.create(
      {
        name: fields.name,
        email: fields.email.toLowerCase(),
        passwordHash: fields.passwordHash ?? null,
        emailVerified: fields.emailVerified ?? false,
        avatarUrl: fields.avatarUrl ?? null,
        plan: "free",
        credits: 0,
      },
      { transaction: t },
    );
    await applyCredits(
      u.id,
      SIGNUP_CREDITS,
      { kind: "grant", description: "Signup bonus", refType: "signup" },
      t,
    );
    return u;
  });
  await user.reload();
  return user;
}

/** Mint access + rotating refresh tokens and set httpOnly cookies. */
export async function issueSession(res: Response, user: User, meta: SessionMeta): Promise<void> {
  const accessToken = signAccess({ sub: user.id, plan: user.plan });
  const refreshToken = randomToken(32);
  await RefreshToken.create({
    userId: user.id,
    tokenHash: sha256(refreshToken),
    expiresAt: new Date(Date.now() + REFRESH_TTL_S * 1000),
    userAgent: meta.userAgent,
    ip: meta.ip,
  });
  setAuthCookies(res, accessToken, refreshToken);
}

export async function signup(
  input: { name: string; email: string; password: string },
  res: Response,
  meta: SessionMeta,
): Promise<PublicUser> {
  const existing = await User.findOne({ where: { email: input.email.toLowerCase() } });
  if (existing) throw badRequest("That email is already registered");
  const user = await createUserWithGrant({
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
  });
  await issueSession(res, user, meta);
  return serializeUser(user);
}

export async function login(
  input: { email: string; password: string },
  res: Response,
  meta: SessionMeta,
): Promise<PublicUser> {
  const user = await User.findOne({ where: { email: input.email.toLowerCase() } });
  if (!user || !user.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
    throw unauthorized("Invalid email or password");
  }
  await issueSession(res, user, meta);
  return serializeUser(user);
}

export async function refresh(
  rawRefresh: string | undefined,
  res: Response,
  meta: SessionMeta,
): Promise<PublicUser> {
  if (!rawRefresh) throw unauthorized("No refresh token");
  const row = await RefreshToken.findOne({ where: { tokenHash: sha256(rawRefresh) } });
  if (!row || row.revokedAt || row.expiresAt < new Date()) {
    throw unauthorized("Invalid or expired session");
  }
  row.revokedAt = new Date(); // rotate: revoke old
  await row.save();
  const user = await User.findByPk(row.userId);
  if (!user) throw unauthorized();
  await issueSession(res, user, meta);
  return serializeUser(user);
}

export async function logout(rawRefresh: string | undefined, res: Response): Promise<void> {
  if (rawRefresh) {
    await RefreshToken.update(
      { revokedAt: new Date() },
      { where: { tokenHash: sha256(rawRefresh) } },
    );
  }
  clearAuthCookies(res);
}

export async function startMagicLink(email: string): Promise<void> {
  const token = randomToken(32);
  await redis.set(`magic:${token}`, email.toLowerCase(), "EX", 15 * 60);
  const link = `${env.API_URL}/api/v1/auth/magic-link/verify?token=${token}`;
  await sendMagicLink(email, link);
}

/** Verify a magic-link token → existing or newly-created (passwordless) user. */
export async function verifyMagicLink(
  token: string,
  res: Response,
  meta: SessionMeta,
): Promise<void> {
  const key = `magic:${token}`;
  const email = await redis.get(key);
  if (!email) throw badRequest("This sign-in link is invalid or has expired");
  await redis.del(key);

  let user = await User.findOne({ where: { email } });
  if (!user) {
    user = await createUserWithGrant({
      name: email.split("@")[0],
      email,
      emailVerified: true,
    });
  } else if (!user.emailVerified) {
    user.emailVerified = true;
    await user.save();
  }
  await issueSession(res, user, meta);
}

/** Passport verify-callback target: upsert the user for an OAuth identity. */
export async function upsertOAuthUser(input: {
  provider: OAuthProvider;
  providerAccountId: string;
  email: string | null;
  name: string;
  avatarUrl?: string | null;
}): Promise<User> {
  const account = await OAuthAccount.findOne({
    where: { provider: input.provider, providerAccountId: input.providerAccountId },
  });
  if (account) {
    const existing = await User.findByPk(account.userId);
    if (existing) return existing;
  }

  // Link to an existing user by email, else create one.
  let user = input.email ? await User.findOne({ where: { email: input.email.toLowerCase() } }) : null;
  if (!user) {
    user = await createUserWithGrant({
      name: input.name || "User",
      email: input.email ?? `${input.provider}_${input.providerAccountId}@oauth.dromo`,
      emailVerified: !!input.email,
      avatarUrl: input.avatarUrl ?? null,
    });
  }
  await OAuthAccount.findOrCreate({
    where: { provider: input.provider, providerAccountId: input.providerAccountId },
    defaults: {
      userId: user.id,
      provider: input.provider,
      providerAccountId: input.providerAccountId,
    },
  });
  return user;
}

export { REFRESH_COOKIE };
