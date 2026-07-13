export type UserRole = "user" | "admin";

export type JwtPayload = {
  userId: string;
  email: string;
  role: UserRole;
};
