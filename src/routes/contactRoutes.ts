import { Router } from "express";
import * as contactController from "../controllers/contactController.js";
import { validate } from "../middleware/validate.js";
import { contactSchema } from "../validators/schemas.js";

const router = Router();

router.post("/", validate(contactSchema), contactController.submitContact);

export default router;
