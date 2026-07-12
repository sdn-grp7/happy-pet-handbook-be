import { Router } from "express";
import { validate } from "../../shared/middleware/validate.js";
import * as authController from "./controller.js";
import { requireAuth } from "./middleware.js";
import {
  googleLoginSchema,
  loginSchema,
  registerSchema,
  updateMeSchema,
  changePasswordSchema,
} from "./schemas.js";

const router = Router();

router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.post("/google", validate(googleLoginSchema), authController.googleLogin);
router.get("/me", requireAuth, authController.me);
router.patch("/me", requireAuth, validate(updateMeSchema), authController.updateMe);
router.post(
  "/change-password",
  requireAuth,
  validate(changePasswordSchema),
  authController.changePassword,
);

export default router;
