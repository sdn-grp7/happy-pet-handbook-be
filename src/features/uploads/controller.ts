import type { Request, Response } from "express";
import { AppError } from "../../shared/errors.js";
import { uploadImageBuffer } from "../auth/cloudinary.js";

const ALLOWED_FOLDERS = new Set([
  "pawpath/avatars",
  "pawpath/care",
  "pawpath/check-ins",
  "pawpath/vaccines",
  "pawpath/forum",
]);

export async function uploadImage(req: Request, res: Response) {
  const file = req.file;
  if (!file) throw new AppError(400, "Image file is required");

  const folderRaw = typeof req.body?.folder === "string" ? req.body.folder.trim() : "";
  const folder = ALLOWED_FOLDERS.has(folderRaw) ? folderRaw : "pawpath/care";

  const url = await uploadImageBuffer(file.buffer, file.originalname || "upload.jpg", folder);
  res.status(201).json({ url });
}
