import { Router } from "express";
import { validate } from "../../shared/middleware/validate.js";
import * as communityController from "./controller.js";
import { feedQuerySchema } from "./schemas.js";

const router = Router();

router.get("/feed", validate(feedQuerySchema, "query"), communityController.getFeed);

export default router;
