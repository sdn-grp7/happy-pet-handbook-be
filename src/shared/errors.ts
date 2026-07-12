import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  if (err instanceof jwt.JsonWebTokenError) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
}
