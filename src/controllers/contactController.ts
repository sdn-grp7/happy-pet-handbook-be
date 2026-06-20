import type { Request, Response } from "express";
import { ContactMessage } from "../models/ContactMessage.js";

export async function submitContact(req: Request, res: Response) {
  const { name, email, message } = req.body as { name: string; email: string; message: string };

  const contact = await ContactMessage.create({ name, email, message });

  res.status(201).json({
    message: "Message received",
    id: contact._id,
  });
}
