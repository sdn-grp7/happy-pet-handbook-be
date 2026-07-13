import { z } from "zod";
import { breedsForSpecies, normalizeBreed, PET_BREEDS, type PetBreed } from "./breeds.js";

export const speciesSchema = z.enum(["dog", "cat"]);
export const genderSchema = z.enum(["male", "female", "unknown"]);
export const statusSchema = z.enum(["available", "pending", "adopted"]);
export const breedSchema = z.enum(PET_BREEDS as unknown as [PetBreed, ...PetBreed[]]);
export const objectIdStringSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid user id");

export const listPetsQuerySchema = z.object({
  status: statusSchema.optional(),
  species: speciesSchema.optional(),
  breed: breedSchema.optional(),
  /** Filter pets currently adopted by this user id. */
  adoptedBy: objectIdStringSchema.optional(),
});

export const petIdParamsSchema = z.object({
  id: z.string().min(1),
});

const pickupBodySchema = z.object({
  address: z.string().min(1),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

function refineBreedForSpecies(
  data: { species?: "dog" | "cat"; breed?: PetBreed },
  ctx: z.RefinementCtx,
) {
  if (!data.species || !data.breed) return;
  const allowed = breedsForSpecies(data.species);
  if (!allowed.includes(data.breed)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Breed ${data.breed} is not valid for species ${data.species}`,
      path: ["breed"],
    });
  }
}

export const createPetBodySchema = z
  .object({
    /** Optional — auto-generated for user listings when omitted. */
    code: z.string().min(1).max(64).optional(),
    name: z.string().min(1).max(120),
    species: speciesSchema,
    breed: breedSchema,
    gender: genderSchema,
    /** Age in whole months (source of truth for filtering). */
    ageMonths: z.number().int().min(0).max(360),
    weightKg: z.number().positive().optional(),
    healthStatus: z.string().min(1).max(200),
    intakeYear: z.number().int().min(1990).max(2100).optional(),
    description: z.string().max(20000).optional(),
    notes: z.string().max(5000).optional(),
    images: z.array(z.string().url()).min(1).max(12),
    status: statusSchema.optional().default("available"),
    /** Required when status is adopted — Mongo user id of the adopter. */
    adoptedByUserId: objectIdStringSchema.optional(),
    zaloPhone: z.string().max(32).optional(),
    pickup: pickupBodySchema.optional(),
  })
  .superRefine((data, ctx) => {
    refineBreedForSpecies(data, ctx);
    if (data.status === "adopted" && !data.adoptedByUserId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "adoptedByUserId is required when status is adopted",
        path: ["adoptedByUserId"],
      });
    }
    if (data.status !== "adopted" && data.adoptedByUserId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "adoptedByUserId is only allowed when status is adopted",
        path: ["adoptedByUserId"],
      });
    }
  });

export const updatePetBodySchema = z
  .object({
    code: z.string().min(1).max(64).optional(),
    name: z.string().min(1).max(120).optional(),
    species: speciesSchema.optional(),
    breed: breedSchema.optional(),
    gender: genderSchema.optional(),
    ageMonths: z.number().int().min(0).max(360).optional(),
    weightKg: z.number().positive().optional(),
    healthStatus: z.string().min(1).max(200).optional(),
    intakeYear: z.number().int().min(1990).max(2100).optional(),
    description: z.string().max(20000).optional(),
    notes: z.string().max(5000).optional(),
    images: z.array(z.string().url()).optional(),
    status: statusSchema.optional(),
    /** Set/replace adopter; null clears. Required when changing status to adopted. */
    adoptedByUserId: objectIdStringSchema.nullable().optional(),
    zaloPhone: z.string().max(32).optional(),
    pickup: pickupBodySchema.optional(),
  })
  .superRefine((data, ctx) => {
    refineBreedForSpecies(data, ctx);
    if (data.status === "adopted" && data.adoptedByUserId === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cannot clear adopter while status is adopted",
        path: ["adoptedByUserId"],
      });
    }
    if (
      data.status != null &&
      data.status !== "adopted" &&
      data.adoptedByUserId != null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "adoptedByUserId is only allowed when status is adopted",
        path: ["adoptedByUserId"],
      });
    }
  });

export const addVaccinationBodySchema = z.object({
  name: z.string().min(1).max(120),
  date: z.string().min(1).max(32),
  nextDue: z.string().max(32).optional(),
  notes: z.string().max(2000).optional(),
  photoUrl: z.string().url().optional(),
});

export const addCheckInBodySchema = z.object({
  photoUrl: z.string().url(),
  caption: z.string().min(1).max(2000),
  date: z.string().max(32).optional(),
});

export type CreatePetBody = z.infer<typeof createPetBodySchema>;
export type UpdatePetBody = z.infer<typeof updatePetBodySchema>;
export type AddVaccinationBody = z.infer<typeof addVaccinationBodySchema>;
export type AddCheckInBody = z.infer<typeof addCheckInBodySchema>;

export { normalizeBreed, PET_BREEDS };
export type { PetBreed };
