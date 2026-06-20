import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { Strategy as LinkedInStrategy } from "passport-linkedin-oauth2";
import { env } from "./env";
import { logger } from "./logger";
import { upsertOAuthUser } from "@/services/auth.service";
import type { OAuthProvider } from "@/types";

export const configuredProviders = new Set<OAuthProvider>();

const callbackUrl = (p: OAuthProvider) =>
  `${env.API_URL}/api/v1/auth/oauth/${p}/callback`;

const firstEmail = (p: any): string | null => p?.emails?.[0]?.value ?? null;
const firstPhoto = (p: any): string | null => p?.photos?.[0]?.value ?? null;

async function handle(
  provider: OAuthProvider,
  profile: any,
  done: any,
): Promise<void> {
  try {
    const user = await upsertOAuthUser({
      provider,
      providerAccountId: String(profile.id),
      email: firstEmail(profile),
      name: profile.displayName || profile.username || "User",
      avatarUrl: firstPhoto(profile),
    });
    done(null, user);
  } catch (err) {
    done(err);
  }
}

export function configurePassport(): typeof passport {
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
          callbackURL: callbackUrl("google"),
        },
        (_a, _r, profile, done) => handle("google", profile, done),
      ),
    );
    configuredProviders.add("google");
  }

  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: env.GITHUB_CLIENT_ID,
          clientSecret: env.GITHUB_CLIENT_SECRET,
          callbackURL: callbackUrl("github"),
        },
        (_a: string, _r: string, profile: any, done: any) =>
          handle("github", profile, done),
      ),
    );
    configuredProviders.add("github");
  }

  if (env.LINKEDIN_CLIENT_ID && env.LINKEDIN_CLIENT_SECRET) {
    passport.use(
      new LinkedInStrategy(
        {
          clientID: env.LINKEDIN_CLIENT_ID,
          clientSecret: env.LINKEDIN_CLIENT_SECRET,
          callbackURL: callbackUrl("linkedin"),
          scope: ["r_emailaddress", "r_liteprofile"],
          state: true,
        },
        (_a, _r, profile, done) => handle("linkedin", profile, done),
      ),
    );
    configuredProviders.add("linkedin");
  }

  if (configuredProviders.size) {
    logger.info(
      `OAuth providers configured: ${[...configuredProviders].join(", ")}`,
    );
  } else {
    logger.warn(
      "No OAuth providers configured (set *_CLIENT_ID / *_CLIENT_SECRET)",
    );
  }
  return passport;
}

/** Scopes requested at the consent screen, per provider. */
export const OAUTH_SCOPES: Record<OAuthProvider, string[]> = {
  google: ["profile", "email"],
  github: ["user:email"],
  linkedin: ["r_emailaddress", "r_liteprofile"],
};
