import { env } from "./env.js";

function buildSwaggerServers() {
  const servers: { url: string; description: string }[] = [];

  const productionUrl = env.RENDER_EXTERNAL_URL ?? env.PUBLIC_URL;
  if (productionUrl) {
    servers.push({
      url: productionUrl.replace(/\/$/, ""),
      description: "Production (Render)",
    });
  }

  servers.push({
    url: `http://localhost:${env.PORT}`,
    description: "Local development",
  });

  return servers;
}

export function getOpenApiSpec() {
  return {
  openapi: "3.0.3",
  info: {
    title: "Happy Pet Handbook API",
    version: "1.0.0",
    description: "Backend API for PawPath — auth, contact, and more.",
  },
  servers: buildSwaggerServers(),
  tags: [
    { name: "Health", description: "Server health checks" },
    { name: "Auth", description: "Registration and login" },
    { name: "Contact", description: "Contact form submissions" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: { type: "string", example: "Validation failed" },
        },
      },
      HealthResponse: {
        type: "object",
        properties: {
          status: { type: "string", example: "ok" },
          timestamp: { type: "string", format: "date-time" },
        },
      },
      RegisterRequest: {
        type: "object",
        required: ["name", "email", "password"],
        properties: {
          name: { type: "string", minLength: 1, maxLength: 100, example: "Mai Nguyen" },
          email: { type: "string", format: "email", example: "mai@example.com" },
          password: { type: "string", minLength: 8, maxLength: 128, example: "password123" },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "mai@example.com" },
          password: { type: "string", example: "password123" },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string", example: "665a1b2c3d4e5f6789012345" },
          name: { type: "string", example: "Mai Nguyen" },
          email: { type: "string", example: "mai@example.com" },
          role: { type: "string", enum: ["user"], example: "user" },
        },
      },
      AuthResponse: {
        type: "object",
        properties: {
          token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
          user: { $ref: "#/components/schemas/User" },
        },
      },
      MeResponse: {
        type: "object",
        properties: {
          user: { $ref: "#/components/schemas/User" },
        },
      },
      ContactRequest: {
        type: "object",
        required: ["name", "email", "message"],
        properties: {
          name: { type: "string", minLength: 1, maxLength: 100, example: "Mai Nguyen" },
          email: { type: "string", format: "email", example: "mai@example.com" },
          message: {
            type: "string",
            minLength: 1,
            maxLength: 5000,
            example: "How often should I feed my kitten?",
          },
        },
      },
      ContactResponse: {
        type: "object",
        properties: {
          message: { type: "string", example: "Message received" },
          id: { type: "string", example: "665a1b2c3d4e5f6789012345" },
        },
      },
    },
  },
  paths: {
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        responses: {
          "200": {
            description: "Server is running",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthResponse" },
              },
            },
          },
        },
      },
    },
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "User created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          "409": {
            description: "Email already registered",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Login successful",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
              },
            },
          },
          "401": {
            description: "Invalid credentials",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current user profile",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Current user",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MeResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },
    "/api/contact": {
      post: {
        tags: ["Contact"],
        summary: "Submit contact form",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ContactRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Message saved",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ContactResponse" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },
  },
  };
}
