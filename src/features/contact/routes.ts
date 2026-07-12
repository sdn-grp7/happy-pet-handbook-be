import { Router } from "express";
import { validate } from "../../shared/middleware/validate.js";
import * as contactController from "./controller.js";
import { contactSchema } from "./schemas.js";

const router = Router();

router.post("/", validate(contactSchema), contactController.submitContact);

export default router;
