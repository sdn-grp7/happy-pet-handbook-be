import { z } from "zod";

export const objectIdStringSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid id");

export const userIdParamsSchema = z.object({
  id: objectIdStringSchema,
});

export const upsertRatingBodySchema = z.object({
  petId: objectIdStringSchema,
  revieweeId: objectIdStringSchema,
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export type UpsertRatingBody = z.infer<typeof upsertRatingBodySchema>;
