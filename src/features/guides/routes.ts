import { Router } from "express";
import multer from "multer";
import { validate } from "../../shared/middleware/validate.js";
import { requireAdmin, requireAuth } from "../auth/middleware.js";
import * as guidesController from "./controller.js";
import {
  createGuideBodySchema,
  guideIdParamsSchema,
  guideSlugParamsSchema,
  updateGuideBodySchema,
} from "./schemas.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const router = Router();

router.get("/", guidesController.listGuides);
router.get("/admin/all", requireAuth, requireAdmin, guidesController.listGuidesAdmin);
router.get(
  "/:slug/file",
  validate(guideSlugParamsSchema, "params"),
  guidesController.streamGuidePdf,
);
router.get("/:slug", validate(guideSlugParamsSchema, "params"), guidesController.getGuideBySlug);

router.post(
  "/",
  requireAuth,
  requireAdmin,
  upload.single("pdf"),
  validate(createGuideBodySchema),
  guidesController.createGuide,
);

router.patch(
  "/:id",
  requireAuth,
  requireAdmin,
  upload.single("pdf"),
  validate(guideIdParamsSchema, "params"),
  validate(updateGuideBodySchema),
  guidesController.updateGuide,
);

router.delete(
  "/:id",
  requireAuth,
  requireAdmin,
  validate(guideIdParamsSchema, "params"),
  guidesController.deleteGuide,
);

export default router;
