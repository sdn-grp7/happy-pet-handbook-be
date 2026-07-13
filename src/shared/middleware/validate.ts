import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { AppError } from "../errors.js";

type RequestTarget = "body" | "query" | "params";

export function validate<T>(schema: ZodSchema<T>, target: RequestTarget = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(", ");
      return next(new AppError(400, message));
    }
    // Express 5: req.query is a getter — plain assignment throws.
    if (target === "query") {
      Object.defineProperty(req, "query", {
        value: result.data,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    } else {
      req[target] = result.data as typeof req[typeof target];
    }
    next();
  };
}
