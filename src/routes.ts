import { Router } from "express";
import authRoutes from "./features/auth/routes.js";
import communityRoutes from "./features/community/routes.js";
import contactRoutes from "./features/contact/routes.js";
import guidesRoutes from "./features/guides/routes.js";
import healthRoutes from "./features/health/routes.js";
import petsRoutes from "./features/pets/routes.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/community", communityRoutes);
router.use("/v1/posts", communityRoutes);
router.use("/contact", contactRoutes);
router.use("/guides", guidesRoutes);
router.use("/pets", petsRoutes);

export default router;
