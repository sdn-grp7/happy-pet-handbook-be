import { z } from "zod";

export const feedQuerySchema = z.object({
  skip: z.coerce.number().int().min(0).optional().default(0),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export type FeedQuery = z.infer<typeof feedQuerySchema>;
