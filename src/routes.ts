import { Router } from "express";
import authRoutes from "./features/auth/routes.js";
import contactRoutes from "./features/contact/routes.js";
import healthRoutes from "./features/health/routes.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/contact", contactRoutes);

export default router;
