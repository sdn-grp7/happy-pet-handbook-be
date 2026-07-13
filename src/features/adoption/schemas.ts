import { z } from "zod";

export const objectIdStringSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

export const requestIdParamsSchema = z.object({
  id: objectIdStringSchema,
});

export const createAdoptionRequestBodySchema = z.object({
  petId: objectIdStringSchema,
  message: z.string().trim().max(2000).optional().default(""),
});

export type CreateAdoptionRequestBody = z.infer<typeof createAdoptionRequestBodySchema>;
