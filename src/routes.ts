import { Router } from "express";
import adoptionRoutes from "./features/adoption/routes.js";
import authRoutes from "./features/auth/routes.js";
import communityRoutes from "./features/community/routes.js";
import contactRoutes from "./features/contact/routes.js";
import guidesRoutes from "./features/guides/routes.js";
import healthRoutes from "./features/health/routes.js";
import petsRoutes from "./features/pets/routes.js";
import reputationRoutes from "./features/reputation/routes.js";
import uploadsRoutes from "./features/uploads/routes.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/community", communityRoutes);
router.use("/v1/posts", communityRoutes);
router.use("/contact", contactRoutes);
router.use("/guides", guidesRoutes);
router.use("/pets", petsRoutes);
router.use("/reputation", reputationRoutes);
router.use("/adoption", adoptionRoutes);
router.use("/uploads", uploadsRoutes);

export default router;
