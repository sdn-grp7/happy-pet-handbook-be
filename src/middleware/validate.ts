import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { AppError } from "../utils/auth.js";

type RequestTarget = "body" | "query" | "params";

export function validate<T>(schema: ZodSchema<T>, target: RequestTarget = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(", ");
      return next(new AppError(400, message));
    }
    req[target] = result.data;
    next();
  };
}
