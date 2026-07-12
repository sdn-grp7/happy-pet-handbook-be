import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env, getCorsOrigins } from "./config/env.js";
import { setupSwagger } from "./config/swagger.js";
import apiRoutes from "./routes.js";
import { errorHandler } from "./shared/errors.js";

export function createApp() {
  const app = express();

  setupSwagger(app);

  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === "development" ? false : undefined,
    }),
  );
  app.use(
    cors({
      origin: getCorsOrigins(),
      credentials: true,
    }),
  );
  app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));
  app.use(express.json({ limit: "1mb" }));

  app.use("/api", apiRoutes);

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  app.use(errorHandler);

  return app;
}
