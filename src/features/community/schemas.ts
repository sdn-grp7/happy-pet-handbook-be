import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
const imageUrlSchema = z.string().trim().min(1).max(2048);
const tagSchema = z.string().trim().min(1).max(40);

export const feedQuerySchema = z.object({
  skip: z.coerce.number().int().min(0).optional().default(0),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export const commentsQuerySchema = z.object({
  skip: z.coerce.number().int().min(0).optional().default(0),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const postIdParamsSchema = z.object({
  postId: objectIdSchema,
});

export const postCommentParamsSchema = z.object({
  postId: objectIdSchema,
  commentId: objectIdSchema,
});

export const createPostBodySchema = z.object({
  content: z.string().trim().min(1, "Content is required").max(5000),
  imageUrls: z.array(imageUrlSchema).max(10).optional().default([]),
  tags: z.array(tagSchema).max(10).optional().default([]),
});

export const updatePostBodySchema = z
  .object({
    content: z.string().trim().min(1).max(5000).optional(),
    imageUrls: z.array(imageUrlSchema).max(10).optional(),
    tags: z.array(tagSchema).max(10).optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    message: "At least one field is required",
  });

export const createCommentBodySchema = z.object({
  content: z.string().trim().min(1, "Content is required").max(2000),
});

export const updateCommentBodySchema = createCommentBodySchema;

export type FeedQuery = z.infer<typeof feedQuerySchema>;
export type CommentsQuery = z.infer<typeof commentsQuerySchema>;
export type PostIdParams = z.infer<typeof postIdParamsSchema>;
export type PostCommentParams = z.infer<typeof postCommentParamsSchema>;
export type CreatePostBody = z.infer<typeof createPostBodySchema>;
export type UpdatePostBody = z.infer<typeof updatePostBodySchema>;
export type CreateCommentBody = z.infer<typeof createCommentBodySchema>;
export type UpdateCommentBody = z.infer<typeof updateCommentBodySchema>;
