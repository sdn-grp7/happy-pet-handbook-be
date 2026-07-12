import type { Express } from "express";
import swaggerUi from "swagger-ui-express";
import { getOpenApiSpec } from "./openapi.js";
import { swaggerBasicAuth } from "../middleware/swaggerAuth.js";

export function setupSwagger(app: Express) {
  const spec = getOpenApiSpec();

  app.get("/api/docs.json", swaggerBasicAuth, (_req, res) => {
    res.json(spec);
  });

  app.use(
    "/api/docs",
    swaggerBasicAuth,
    swaggerUi.serve,
    swaggerUi.setup(spec, {
      customSiteTitle: "Happy Pet Handbook API",
    }),
  );
}
