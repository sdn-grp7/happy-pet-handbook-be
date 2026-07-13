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

export type UploadedPdf = {
  url: string;
  publicId: string;
};

/**
 * Upload a PDF as an image resource (not raw).
 * Cloudinary often returns 401 for public raw PDF delivery; image/upload URLs work with pdf.js.
 */
export async function uploadPdfBuffer(
  buffer: Buffer,
  filename: string,
  folder = "pawpath/guides",
): Promise<UploadedPdf> {
  ensureCloudinary();
  const baseName = filename.replace(/\.pdf$/i, "").replace(/[^a-zA-Z0-9_-]/g, "-");

  const result = await new Promise<{
    secure_url?: string;
    public_id?: string;
  }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: `${baseName}-${Date.now()}`,
        resource_type: "image",
        format: "pdf",
        type: "upload",
        access_mode: "public",
        overwrite: true,
      },
      (err, res) => {
        if (err || !res) reject(err ?? new Error("Empty Cloudinary response"));
        else resolve(res);
      },
    );
    stream.end(buffer);
  });

  if (!result.secure_url || !result.public_id) {
    throw new AppError(502, "Failed to upload PDF to Cloudinary");
  }
  return { url: result.secure_url, publicId: result.public_id };
}

/** Upload a remote PDF URL to Cloudinary (image resource for public delivery). */
export async function uploadPdfFromUrl(
  pdfUrl: string,
  publicIdBase: string,
  folder = "pawpath/guides",
): Promise<UploadedPdf> {
  ensureCloudinary();
  const result = await cloudinary.uploader.upload(pdfUrl, {
    folder,
    public_id: publicIdBase,
    resource_type: "image",
    format: "pdf",
    type: "upload",
    access_mode: "public",
    overwrite: true,
  });
  if (!result.secure_url || !result.public_id) {
    throw new AppError(502, "Failed to upload PDF to Cloudinary");
  }
  return { url: result.secure_url, publicId: result.public_id };
}

export async function destroyGuideAsset(publicId: string) {
  if (!publicId) return;
  ensureCloudinary();
  try {
    // Prefer image (current); also try raw for assets uploaded before the fix.
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  } catch {
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
    } catch (err) {
      console.warn("Cloudinary destroy failed:", publicId, err);
    }
  }
}

/** Build a short-lived authenticated download URL for a guide PDF. */
export function guidePdfPrivateDownloadUrl(publicId: string): string {
  ensureCloudinary();
  return cloudinary.utils.private_download_url(publicId, "pdf", {
    resource_type: "image",
    type: "upload",
    attachment: false,
    expires_at: Math.floor(Date.now() / 1000) + 15 * 60,
  });
}

/**
 * Fetch guide PDF bytes from Cloudinary.
 * Public CDN delivery of PDFs often returns 401 on free accounts — use private download API instead.
 */
export async function fetchGuidePdfFromCloudinary(publicId: string): Promise<{
  body: ReadableStream<Uint8Array> | null;
  contentLength: string | null;
}> {
  ensureCloudinary();
  const url = guidePdfPrivateDownloadUrl(publicId);
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new AppError(502, `Failed to fetch guide PDF from Cloudinary (${res.status})`);
  }
  return {
    body: res.body,
    contentLength: res.headers.get("content-length"),
  };
}
