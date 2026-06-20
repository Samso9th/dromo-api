import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny, infer as zInfer } from "zod";

type Schemas = { body?: ZodTypeAny; query?: ZodTypeAny; params?: ZodTypeAny };

/** Validate + coerce request parts with Zod; replaces the raw values with parsed ones. */
export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query)
        Object.assign(req.query, schemas.query.parse(req.query));
      if (schemas.params)
        Object.assign(req.params, schemas.params.parse(req.params));
      next();
    } catch (err) {
      next(err);
    }
  };
}

export type Body<T extends ZodTypeAny> = zInfer<T>;
