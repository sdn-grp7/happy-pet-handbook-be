import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors.js";
import { getTrustSummary } from "../reputation/aggregate.js";
import { uploadImageFromUrl } from "./cloudinary.js";
import { signToken } from "./jwt.js";
import { User } from "./model.js";

function toPublicUser(user: {
  _id: { toString(): string };
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
  googleId?: string | null;
  password?: string | null;
  createdAt?: Date;
}) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar ?? undefined,
    googleId: user.googleId ?? undefined,
    hasPassword: Boolean(user.password),
    createdAt: user.createdAt?.toISOString?.() ?? undefined,
  };
}

function authResponse(user: Parameters<typeof toPublicUser>[0]) {
  const token = signToken({
    userId: user._id.toString(),
    email: user.email,
    role: user.role as "user" | "admin",
  });
  return { token, user: toPublicUser(user) };
}

export async function register(req: Request, res: Response) {
  const { name, email, password } = req.body as { name: string; email: string; password: string };

  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError(409, "Email already registered");
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, password: hashed });

  res.status(201).json(authResponse(user));
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as { email: string; password: string };

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    throw new AppError(401, "Invalid email or password");
  }

  if (!user.password) {
    throw new AppError(401, "This account uses Google sign-in. Please continue with Google.");
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw new AppError(401, "Invalid email or password");
  }

  res.json(authResponse(user));
}

export async function googleLogin(req: Request, res: Response) {
  const { idToken } = req.body as { idToken: string };

  if (!env.GOOGLE_CLIENT_ID) {
    throw new AppError(
      503,
      "Google sign-in is not configured. Set GOOGLE_CLIENT_ID on the server.",
    );
  }

  const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
  const ticket = await client.verifyIdToken({
    idToken,
    audience: env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw new AppError(401, "Invalid Google token");
  }

  const googleId = payload.sub;
  const email = payload.email.toLowerCase();
  const name = payload.name?.trim() || email.split("@")[0];
  const picture = payload.picture;

  let user = await User.findOne({ $or: [{ googleId }, { email }] }).select("+password");

  let avatarUrl: string | undefined = user?.avatar ?? undefined;
  if (picture) {
    try {
      if (!avatarUrl || !user?.googleId) {
        avatarUrl = await uploadImageFromUrl(picture);
      }
    } catch (err) {
      console.error("Cloudinary avatar upload failed:", err);
      avatarUrl = avatarUrl ?? picture;
    }
  }

  if (user) {
    user.googleId = googleId;
    if (name && user.name !== name) user.name = name;
    if (avatarUrl) user.avatar = avatarUrl;
    await user.save();
  } else {
    user = await User.create({
      name,
      email,
      googleId,
      avatar: avatarUrl,
    });
  }

  res.json(authResponse(user));
}

export async function me(req: Request, res: Response) {
  const user = await User.findById(req.user!.userId).select("+password");
  if (!user) {
    throw new AppError(404, "User not found");
  }

  res.json({ user: toPublicUser(user) });
}

export async function updateMe(req: Request, res: Response) {
  const { avatar, name } = req.body as { avatar?: string; name?: string };
  const user = await User.findById(req.user!.userId).select("+password");
  if (!user) {
    throw new AppError(404, "User not found");
  }

  if (typeof name === "string" && name.trim()) user.name = name.trim();
  if (typeof avatar === "string" && avatar.trim()) user.avatar = avatar.trim();
  await user.save();

  res.json({ user: toPublicUser(user) });
}

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string;
    newPassword: string;
  };

  const user = await User.findById(req.user!.userId).select("+password");
  if (!user) {
    throw new AppError(404, "User not found");
  }

  if (user.password) {
    if (!currentPassword) {
      throw new AppError(400, "Current password is required");
    }
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      throw new AppError(401, "Current password is incorrect");
    }
    if (await bcrypt.compare(newPassword, user.password)) {
      throw new AppError(400, "New password must be different from the current password");
    }
  }

  user.password = await bcrypt.hash(newPassword, 12);
  await user.save();

  res.json({ message: "Password updated", user: toPublicUser(user) });
}

/** Public profile card — no email / password fields. */
export async function getPublicProfile(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  if (!/^[a-f\d]{24}$/i.test(id)) throw new AppError(404, "User not found");

  const user = await User.findById(id).lean();
  if (!user) throw new AppError(404, "User not found");

  const trust = await getTrustSummary(id);

  res.json({
    user: {
      id: user._id.toString(),
      name: user.name,
      role: user.role,
      avatar: user.avatar ?? undefined,
      createdAt: user.createdAt?.toISOString?.() ?? undefined,
      trustScore: trust.trustScore,
      reviewCount: trust.reviewCount,
    },
  });
}
