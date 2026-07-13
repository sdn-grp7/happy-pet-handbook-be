import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email"),
  message: z.string().trim().min(1, "Message is required").max(5000),
});

export const contactIdParamsSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id"),
});

export const resolveContactBodySchema = z.object({
  status: z.enum(["new", "resolved"]).default("resolved"),
});

export type ContactBody = z.infer<typeof contactSchema>;
export type ResolveContactBody = z.infer<typeof resolveContactBodySchema>;
