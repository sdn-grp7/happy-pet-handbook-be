export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Happy Pet Handbook API",
    version: "1.0.0",
    description: "Backend API for PawPath — auth, contact, and more.",
  },
  servers: [{ url: "http://localhost:3001", description: "Local development" }],
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
          avatar: {
            type: "string",
            format: "uri",
            example: "https://res.cloudinary.com/demo/image/upload/avatar.jpg",
          },
          googleId: { type: "string", example: "108234567890123456789" },
          hasPassword: { type: "boolean", example: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      GoogleLoginRequest: {
        type: "object",
        required: ["idToken"],
        properties: {
          idToken: { type: "string", example: "eyJhbGciOiJSUzI1NiIsImtpZCI6..." },
        },
      },
      UpdateMeRequest: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1, maxLength: 100 },
          avatar: { type: "string", format: "uri" },
        },
      },
      ChangePasswordRequest: {
        type: "object",
        required: ["newPassword"],
        properties: {
          currentPassword: {
            type: "string",
            minLength: 1,
            example: "oldpassword",
            description: "Required when the account already has a password",
          },
          newPassword: { type: "string", minLength: 8, maxLength: 128, example: "newpassword123" },
        },
      },
      ChangePasswordResponse: {
        type: "object",
        properties: {
          message: { type: "string", example: "Password updated" },
          user: { $ref: "#/components/schemas/User" },
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
    "/api/auth/google": {
      post: {
        tags: ["Auth"],
        summary: "Sign in with Google ID token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GoogleLoginRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Login successful (creates or links account)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
              },
            },
          },
          "401": {
            description: "Invalid Google token",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          "503": {
            description: "Google or Cloudinary not configured",
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
      patch: {
        tags: ["Auth"],
        summary: "Update current user profile",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateMeRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Updated user",
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
    "/api/auth/change-password": {
      post: {
        tags: ["Auth"],
        summary: "Change current user password",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ChangePasswordRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Password updated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ChangePasswordResponse" },
              },
            },
          },
          "400": {
            description: "Invalid request",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          "401": {
            description: "Unauthorized or wrong current password",
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
} as const;
