import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(""),
  CLOUDINARY_API_KEY: z.string().optional().default(""),
  CLOUDINARY_API_SECRET: z.string().optional().default(""),
  RENDER_EXTERNAL_URL: z.string().url().optional(),
  PUBLIC_URL: z.string().url().optional(),
  SWAGGER_USER: z.string().default("admin"),
  SWAGGER_PASSWORD: z.string().default("ok"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid environment variables:", result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();

/** Public base URL — Render sets RENDER_EXTERNAL_URL automatically. */
export function getPublicBaseUrl(): string {
  const raw = env.RENDER_EXTERNAL_URL ?? env.PUBLIC_URL;
  if (raw) return raw.replace(/\/$/, "");
  return `http://localhost:${env.PORT}`;
}

export function getSwaggerDocsUrl(): string {
  return `${getPublicBaseUrl()}/api/docs`;
}
