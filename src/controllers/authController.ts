import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import { User } from "../models/User.js";
import { AppError, signToken } from "../utils/auth.js";

export async function register(req: Request, res: Response) {
  const { name, email, password } = req.body as { name: string; email: string; password: string };

  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError(409, "Email already registered");
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, password: hashed });

  const token = signToken({ userId: user._id.toString(), email: user.email, role: user.role });

  res.status(201).json({
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as { email: string; password: string };

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    throw new AppError(401, "Invalid email or password");
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw new AppError(401, "Invalid email or password");
  }

  const token = signToken({ userId: user._id.toString(), email: user.email, role: user.role });

  res.json({
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
}

export async function me(req: Request, res: Response) {
  const user = await User.findById(req.user!.userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }

  res.json({
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
}
