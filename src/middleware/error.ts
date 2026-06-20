import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "@/utils/app-error";
import { logger } from "@/config/logger";
import { isProd } from "@/config/env";

export function notFoundHandler(_req: Request, res: Response): void {
  res
    .status(404)
    .json({ error: { code: "not_found", message: "Route not found" } });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "validation_error",
        message: "Invalid request",
        details: err.flatten(),
      },
    });
    return;
  }
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }
  const message = err instanceof Error ? err.message : "Unknown error";
  logger.error(`Unhandled error: ${message}`, {
    stack: err instanceof Error ? err.stack : undefined,
  });
  res.status(500).json({
    error: {
      code: "internal_error",
      message: isProd ? "Something went wrong" : message,
    },
  });
}
