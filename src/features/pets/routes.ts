import { Router } from "express";
import { validate } from "../../shared/middleware/validate.js";
import { requireAdmin, requireAuth } from "../auth/middleware.js";
import * as petsController from "./controller.js";
import {
  addCheckInBodySchema,
  addVaccinationBodySchema,
  createPetBodySchema,
  listPetsQuerySchema,
  petIdParamsSchema,
  updatePetBodySchema,
} from "./schemas.js";

const router = Router();

router.get("/", validate(listPetsQuerySchema, "query"), petsController.listPets);
router.get("/pickups", petsController.listPickups);
router.get("/:id", validate(petIdParamsSchema, "params"), petsController.getPet);

router.post(
  "/",
  requireAuth,
  requireAdmin,
  validate(createPetBodySchema),
  petsController.createPet,
);

router.patch(
  "/:id",
  requireAuth,
  requireAdmin,
  validate(petIdParamsSchema, "params"),
  validate(updatePetBodySchema),
  petsController.updatePet,
);

router.delete(
  "/:id",
  requireAuth,
  requireAdmin,
  validate(petIdParamsSchema, "params"),
  petsController.deletePet,
);

router.post(
  "/:id/vaccinations",
  requireAuth,
  requireAdmin,
  validate(petIdParamsSchema, "params"),
  validate(addVaccinationBodySchema),
  petsController.addVaccination,
);

router.post(
  "/:id/check-ins",
  requireAuth,
  validate(petIdParamsSchema, "params"),
  validate(addCheckInBodySchema),
  petsController.addCheckIn,
);

export default router;
