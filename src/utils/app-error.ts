/** Typed application error → consistent { error: { code, message, details } } responses. */
export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const badRequest = (msg: string, details?: unknown) =>
  new AppError(400, "bad_request", msg, details);
export const unauthorized = (msg = "Unauthorized") =>
  new AppError(401, "unauthorized", msg);
export const forbidden = (msg = "Forbidden") =>
  new AppError(403, "forbidden", msg);
export const notFound = (msg = "Not found") =>
  new AppError(404, "not_found", msg);
export const insufficientCredits = (msg = "Insufficient credits") =>
  new AppError(402, "insufficient_credits", msg);

/** Wrap async route handlers so thrown errors reach the error middleware. */
import type { NextFunction, Request, Response } from "express";
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);
