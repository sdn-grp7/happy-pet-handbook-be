import { Router } from "express";
import authRoutes from "./authRoutes.js";
import contactRoutes from "./contactRoutes.js";
import healthRoutes from "./healthRoutes.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/contact", contactRoutes);

export default router;
