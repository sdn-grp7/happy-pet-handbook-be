import { v2 as cloudinary } from "cloudinary";
import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors.js";

let configured = false;

function ensureCloudinary() {
  if (configured) return;
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new AppError(503, "Cloudinary is not configured on the server");
  }
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  configured = true;
}

/** Upload a remote image URL (e.g. Google profile picture) to Cloudinary. */
export async function uploadImageFromUrl(
  imageUrl: string,
  folder = "pawpath/avatars",
): Promise<string> {
  ensureCloudinary();
  const result = await cloudinary.uploader.upload(imageUrl, {
    folder,
    overwrite: true,
    transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face" }],
  });
  if (!result.secure_url) {
    throw new AppError(502, "Failed to upload avatar to Cloudinary");
  }
  return result.secure_url;
}
