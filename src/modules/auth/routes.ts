import { Router, type Request } from "express";
import passport from "passport";
import { validate } from "@/middleware/validate";
import { requireAuth } from "@/middleware/require-auth";
import { signupSchema, loginSchema, magicLinkSchema } from "./schema";
import * as controller from "./controller";
import { configuredProviders, OAUTH_SCOPES } from "@/config/passport";
import { issueSession } from "@/services/auth.service";
import { env } from "@/config/env";
import { badRequest } from "@/utils/app-error";
import type { User } from "@/models";
import { OAUTH_PROVIDERS, type OAuthProvider } from "@/types";

export const authRouter = Router();

authRouter.post("/signup", validate({ body: signupSchema }), controller.signup);
authRouter.post("/login", validate({ body: loginSchema }), controller.login);
authRouter.post(
  "/magic-link",
  validate({ body: magicLinkSchema }),
  controller.startMagicLink,
);
authRouter.get("/magic-link/verify", controller.verifyMagicLink);
authRouter.post("/refresh", controller.refresh);
authRouter.post("/logout", controller.logout);
authRouter.get("/me", requireAuth, controller.me);

function provider(req: Request): OAuthProvider | null {
  const p = req.params.provider;
  return (OAUTH_PROVIDERS as string[]).includes(p)
    ? (p as OAuthProvider)
    : null;
}

authRouter.get("/oauth/:provider", (req, res, next) => {
  const p = provider(req);
  if (!p || !configuredProviders.has(p))
    return next(badRequest("Unsupported OAuth provider"));
  passport.authenticate(p, { session: false, scope: OAUTH_SCOPES[p] })(
    req,
    res,
    next,
  );
});

authRouter.get("/oauth/:provider/callback", (req, res, next) => {
  const p = provider(req);
  if (!p || !configuredProviders.has(p))
    return next(badRequest("Unsupported OAuth provider"));
  passport.authenticate(
    p,
    { session: false },
    async (err: unknown, maybeUser: unknown) => {
      try {
        const user = maybeUser as User | false;
        if (err || !user)
          return res.redirect(`${env.APP_URL}/login?error=oauth`);
        await issueSession(res, user, {
          userAgent: req.headers["user-agent"] ?? null,
          ip: req.ip ?? null,
        });
        res.redirect(`${env.APP_URL}/dashboard`);
      } catch (e) {
        next(e);
      }
    },
  )(req, res, next);
});
