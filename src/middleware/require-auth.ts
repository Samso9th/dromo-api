import type { NextFunction, Request, Response } from "express";
import { verifyAccess } from "@/utils/jwt";
import { ACCESS_COOKIE } from "@/utils/cookies";
import { User } from "@/models";
import { forbidden, unauthorized } from "@/utils/app-error";
import type { Plan } from "@/types";

const PLAN_RANK: Record<Plan, number> = { free: 0, pro: 1, premium: 2 };

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = req.cookies?.[ACCESS_COOKIE];
    if (!token) throw unauthorized();
    let sub: string;
    try {
      sub = verifyAccess(token).sub;
    } catch {
      throw unauthorized("Session expired");
    }
    const user = await User.findByPk(sub);
    if (!user) throw unauthorized();
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/** Use after requireAuth. Blocks if the user's plan is below `min`. */
export function requirePlan(min: Plan) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user as unknown as User | undefined;
    if (!user) return next(unauthorized());
    if (PLAN_RANK[user.plan as Plan] < PLAN_RANK[min]) {
      return next(forbidden(`This requires the ${min} plan or higher`));
    }
    next();
  };
}
