import { Router } from "express";
import { validate } from "../../shared/middleware/validate.js";
import { requireAuth } from "../auth/middleware.js";
import * as adoptionController from "./controller.js";
import { createAdoptionRequestBodySchema, requestIdParamsSchema } from "./schemas.js";

const router = Router();

router.get("/", requireAuth, adoptionController.listRequests);
router.get("/incoming", requireAuth, adoptionController.listIncoming);

router.post(
  "/",
  requireAuth,
  validate(createAdoptionRequestBodySchema),
  adoptionController.createRequest,
);

router.post(
  "/:id/confirm",
  requireAuth,
  validate(requestIdParamsSchema, "params"),
  adoptionController.confirmRequest,
);

router.delete(
  "/:id",
  requireAuth,
  validate(requestIdParamsSchema, "params"),
  adoptionController.deleteRequest,
);

export default router;
