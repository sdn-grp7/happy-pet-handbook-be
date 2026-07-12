export type UserRole = "user";

export type JwtPayload = {
  userId: string;
  email: string;
  role: UserRole;
};
