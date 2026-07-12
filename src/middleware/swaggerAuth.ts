import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

export function swaggerBasicAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Swagger Docs"');
    return res.status(401).send("Authentication required");
  }

  const decoded = Buffer.from(header.slice(6), "base64").toString("utf-8");
  const separator = decoded.indexOf(":");
  const user = separator >= 0 ? decoded.slice(0, separator) : decoded;
  const pass = separator >= 0 ? decoded.slice(separator + 1) : "";

  if (user === env.SWAGGER_USER && pass === env.SWAGGER_PASSWORD) {
    return next();
  }

  res.setHeader("WWW-Authenticate", 'Basic realm="Swagger Docs"');
  return res.status(401).send("Invalid credentials");
}
