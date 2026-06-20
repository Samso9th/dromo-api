import type { Request } from "express";
import type { User } from "@/models";
import { unauthorized } from "@/utils/app-error";

/** Read the authenticated user set by requireAuth (typed as our model). Throws if absent. */
export function reqUser(req: Request): User {
  const user = req.user as unknown as User | undefined;
  if (!user) throw unauthorized();
  return user;
}
