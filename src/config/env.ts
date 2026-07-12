import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  CORS_ORIGIN: z
    .string()
    .default(
      "http://localhost:5173,https://paws-path.netlify.app,https://happy-pet-handbook-fe-five.vercel.app",
    ),
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

/** Deployed base URL (Render) when available — does not fall back to localhost. */
export function getDeployBaseUrl(): string | undefined {
  const raw = env.RENDER_EXTERNAL_URL ?? env.PUBLIC_URL;
  return raw ? raw.replace(/\/$/, "") : undefined;
}

/** Public base URL — Render/PUBLIC_URL in deploy, otherwise localhost. */
export function getPublicBaseUrl(): string {
  return getDeployBaseUrl() ?? `http://localhost:${env.PORT}`;
}

export function getSwaggerDocsUrl(): string {
  return `${getPublicBaseUrl()}/api/docs`;
}

/** Comma-separated CORS_ORIGIN → list of allowed origins. */
export function getCorsOrigins(): string[] {
  return env.CORS_ORIGIN.split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
}
