import { Router } from "express";
import { validate } from "../../shared/middleware/validate.js";
import { requireAdmin, requireAuth } from "../auth/middleware.js";
import * as contactController from "./controller.js";
import { contactIdParamsSchema, contactSchema, resolveContactBodySchema } from "./schemas.js";

const router = Router();

router.post("/", validate(contactSchema), contactController.submitContact);

router.get("/admin/all", requireAuth, requireAdmin, contactController.listContactMessages);

router.patch(
  "/:id",
  requireAuth,
  requireAdmin,
  validate(contactIdParamsSchema, "params"),
  validate(resolveContactBodySchema),
  contactController.resolveContactMessage,
);

export default router;
