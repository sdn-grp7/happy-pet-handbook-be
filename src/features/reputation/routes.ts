import { Router } from "express";
import { validate } from "../../shared/middleware/validate.js";
import { requireAuth } from "../auth/middleware.js";
import * as reputationController from "./controller.js";
import { upsertRatingBodySchema, userIdParamsSchema } from "./schemas.js";

const router = Router();

router.get("/", reputationController.listReputation);
router.get("/pending", requireAuth, reputationController.listPendingRatings);
router.get(
  "/users/:id",
  validate(userIdParamsSchema, "params"),
  reputationController.getUserReputation,
);
router.post(
  "/ratings",
  requireAuth,
  validate(upsertRatingBodySchema),
  reputationController.upsertRating,
);

export default router;
