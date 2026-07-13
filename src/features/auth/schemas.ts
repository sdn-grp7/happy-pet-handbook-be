import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export const googleLoginSchema = z.object({
  idToken: z.string().min(1, "Google ID token is required"),
});

export const updateMeSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    avatar: z.string().url("Invalid avatar URL").optional(),
  })
  .refine((data) => data.name !== undefined || data.avatar !== undefined, {
    message: "Provide name and/or avatar to update",
  });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export const userIdParamsSchema = z.object({
  id: z.string().min(1),
});
