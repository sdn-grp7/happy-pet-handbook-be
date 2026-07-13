import type { Request, Response } from "express";
import { AppError } from "../../shared/errors.js";
import { ContactMessage } from "./model.js";
import type { ResolveContactBody } from "./schemas.js";

function toPublicContact(doc: {
  _id: { toString(): string };
  name: string;
  email: string;
  message: string;
  status?: string | null;
  resolvedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    message: doc.message,
    status: (doc.status === "resolved" ? "resolved" : "new") as "new" | "resolved",
    createdAt: (doc.createdAt ?? new Date()).toISOString(),
    ...(doc.resolvedAt ? { resolvedAt: doc.resolvedAt.toISOString() } : {}),
    ...(doc.updatedAt ? { updatedAt: doc.updatedAt.toISOString() } : {}),
  };
}

export async function submitContact(req: Request, res: Response) {
  const { name, email, message } = req.body as { name: string; email: string; message: string };

  const contact = await ContactMessage.create({ name, email, message, status: "new" });

  res.status(201).json({
    message: "Message received",
    id: contact._id.toString(),
  });
}

export async function listContactMessages(_req: Request, res: Response) {
  const docs = await ContactMessage.find({}).sort({ createdAt: -1 }).lean();
  res.json({
    messages: docs.map((doc) => toPublicContact(doc)),
  });
}

export async function resolveContactMessage(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const body = req.body as ResolveContactBody;
  const status = body.status ?? "resolved";

  const contact = await ContactMessage.findById(id);
  if (!contact) throw new AppError(404, "Contact message not found");

  contact.status = status;
  contact.resolvedAt = status === "resolved" ? new Date() : undefined;
  await contact.save();

  res.json({ message: toPublicContact(contact) });
}
