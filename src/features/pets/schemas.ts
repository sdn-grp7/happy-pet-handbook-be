import { z } from "zod";

export const speciesSchema = z.enum(["dog", "cat"]);
export const genderSchema = z.enum(["male", "female", "unknown"]);
export const statusSchema = z.enum(["available", "pending", "adopted"]);

export const listPetsQuerySchema = z.object({
  status: statusSchema.optional(),
  species: speciesSchema.optional(),
});

export const petIdParamsSchema = z.object({
  id: z.string().min(1),
});

const pickupBodySchema = z.object({
  address: z.string().min(1),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export const createPetBodySchema = z.object({
  code: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  species: speciesSchema,
  breed: z.string().min(1).max(120),
  gender: genderSchema,
  age: z.string().min(1).max(80),
  weightKg: z.number().positive().optional(),
  healthStatus: z.string().min(1).max(200),
  intakeYear: z.number().int().min(1990).max(2100).optional(),
  description: z.string().max(20000).optional(),
  notes: z.string().max(5000).optional(),
  images: z.array(z.string().url()).default([]),
  status: statusSchema.optional().default("available"),
  zaloPhone: z.string().max(32).optional(),
  pickup: pickupBodySchema.optional(),
});

export const updatePetBodySchema = createPetBodySchema.partial();

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
