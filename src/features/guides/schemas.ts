import { z } from "zod";

const localizedSchema = z.object({
  vi: z.string().min(1),
  en: z.string().min(1),
});

export const createGuideBodySchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case"),
  chapter: z.coerce.number().int().min(1),
  titleVi: z.string().min(1),
  titleEn: z.string().min(1),
  subtitleVi: z.string().min(1),
  subtitleEn: z.string().min(1),
  sourceTitle: z.string().optional().default(""),
  attribution: z.string().optional().default(""),
  sourceUrl: z
    .union([z.string().url(), z.literal("")])
    .optional()
    .default(""),
  published: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .optional()
    .transform((v) => (v === undefined ? true : v === true || v === "true")),
});

export const updateGuideBodySchema = createGuideBodySchema.partial();

export const guideSlugParamsSchema = z.object({
  slug: z.string().min(1),
});

export const guideIdParamsSchema = z.object({
  id: z.string().min(1),
});

export type CreateGuideBody = z.infer<typeof createGuideBodySchema>;
export type UpdateGuideBody = z.infer<typeof updateGuideBodySchema>;

export { localizedSchema };
