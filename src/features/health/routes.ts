import { Router } from "express";
import * as healthController from "./controller.js";

const router = Router();

router.get("/", healthController.health);

export default router;
