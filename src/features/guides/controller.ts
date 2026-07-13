import type { Request, Response } from "express";
import { createReadStream, existsSync, statSync } from "node:fs";
import { Readable } from "node:stream";
import { AppError } from "../../shared/errors.js";
import {
  destroyGuideAsset,
  fetchGuidePdfFromCloudinary,
  uploadPdfBuffer,
} from "../auth/cloudinary.js";
import { Guide } from "./model.js";
import type { CreateGuideBody, UpdateGuideBody } from "./schemas.js";
import { deleteGuidePdf, guideStoragePath, makeStorageKey, saveGuidePdf } from "./storage.js";

/** Relative path — FE prefixes with VITE_API_BASE_URL. */
function guideFilePath(slug: string) {
  return `/api/guides/${encodeURIComponent(slug)}/file`;
}

function toPublicGuide(doc: {
  _id: { toString(): string };
  slug: string;
  chapter: number;
  title: { vi: string; en: string };
  subtitle: { vi: string; en: string };
  pdfUrl?: string;
  storageKey?: string | null;
  cloudinaryPublicId?: string | null;
  sourceTitle?: string | null;
  attribution?: string | null;
  sourceUrl?: string | null;
  published?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    id: doc._id.toString(),
    slug: doc.slug,
    chapter: doc.chapter,
    title: doc.title,
    subtitle: doc.subtitle,
    // Always serve via our API — Cloudinary blocks public PDF delivery (401) on many free accounts.
    pdfUrl: guideFilePath(doc.slug),
    sourceTitle: doc.sourceTitle || undefined,
    attribution: doc.attribution || undefined,
    sourceUrl: doc.sourceUrl || undefined,
    published: doc.published ?? true,
    createdAt: doc.createdAt?.toISOString?.(),
    updatedAt: doc.updatedAt?.toISOString?.(),
  };
}

async function optionalCloudinaryUpload(buffer: Buffer, filename: string) {
  try {
    return await uploadPdfBuffer(buffer, filename);
  } catch (err) {
    console.warn("Cloudinary PDF upload skipped/failed:", err);
    return null;
  }
}

export async function listGuides(_req: Request, res: Response) {
  const guides = await Guide.find({ published: true }).sort({ chapter: 1 }).lean();
  res.json({ guides: guides.map((g) => toPublicGuide(g as Parameters<typeof toPublicGuide>[0])) });
}

export async function listGuidesAdmin(_req: Request, res: Response) {
  const guides = await Guide.find().sort({ chapter: 1 }).lean();
  res.json({ guides: guides.map((g) => toPublicGuide(g as Parameters<typeof toPublicGuide>[0])) });
}

export async function getGuideBySlug(req: Request, res: Response) {
  const { slug } = req.params as { slug: string };
  const guide = await Guide.findOne({ slug, published: true }).lean();
  if (!guide) throw new AppError(404, "Guide not found");
  res.json({ guide: toPublicGuide(guide as Parameters<typeof toPublicGuide>[0]) });
}

/** Stream PDF for pdf.js — local disk first, Cloudinary fallback (Render has ephemeral disk). */
export async function streamGuidePdf(req: Request, res: Response) {
  const { slug } = req.params as { slug: string };
  const guide = await Guide.findOne({ slug, published: true });
  if (!guide) throw new AppError(404, "Guide not found");

  const setPdfHeaders = (contentLength?: string | null) => {
    res.setHeader("Content-Type", "application/pdf");
    if (contentLength) res.setHeader("Content-Length", contentLength);
    res.setHeader("Content-Disposition", `inline; filename="${guide.slug}.pdf"`);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("Accept-Ranges", "bytes");
  };

  if (guide.storageKey) {
    const path = guideStoragePath(guide.storageKey);
    if (existsSync(path)) {
      const stat = statSync(path);
      setPdfHeaders(String(stat.size));
      createReadStream(path).pipe(res);
      return;
    }
  }

  if (guide.cloudinaryPublicId) {
    const { body, contentLength } = await fetchGuidePdfFromCloudinary(guide.cloudinaryPublicId);
    if (!body) throw new AppError(502, "Empty PDF response from Cloudinary");
    setPdfHeaders(contentLength);
    Readable.fromWeb(body as import("node:stream/web").ReadableStream).pipe(res);
    return;
  }

  throw new AppError(
    404,
    "Guide PDF file missing on server — re-upload the PDF in admin (Render disk is ephemeral)",
  );
}

export async function createGuide(req: Request, res: Response) {
  const body = req.body as CreateGuideBody;
  const file = req.file;
  if (!file) throw new AppError(400, "PDF file is required");
  if (file.mimetype !== "application/pdf" && !file.originalname.toLowerCase().endsWith(".pdf")) {
    throw new AppError(400, "Only PDF files are allowed");
  }

  const existing = await Guide.findOne({ slug: body.slug });
  if (existing) throw new AppError(409, "Slug already exists");

  const storageKey = makeStorageKey(body.slug);
  saveGuidePdf(storageKey, file.buffer);

  const uploaded = await optionalCloudinaryUpload(file.buffer, file.originalname || body.slug);

  const guide = await Guide.create({
    slug: body.slug,
    chapter: body.chapter,
    title: { vi: body.titleVi, en: body.titleEn },
    subtitle: { vi: body.subtitleVi, en: body.subtitleEn },
    pdfUrl: guideFilePath(body.slug),
    storageKey,
    cloudinaryPublicId: uploaded?.publicId || "",
    sourceTitle: body.sourceTitle || undefined,
    attribution: body.attribution || undefined,
    sourceUrl: body.sourceUrl || undefined,
    published: body.published,
  });

  res.status(201).json({ guide: toPublicGuide(guide) });
}

export async function updateGuide(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const body = req.body as UpdateGuideBody;
  const guide = await Guide.findById(id);
  if (!guide) throw new AppError(404, "Guide not found");

  if (body.slug && body.slug !== guide.slug) {
    const clash = await Guide.findOne({ slug: body.slug });
    if (clash) throw new AppError(409, "Slug already exists");
    guide.slug = body.slug;
  }
  if (body.chapter != null) guide.chapter = body.chapter;
  if (body.titleVi || body.titleEn) {
    guide.title = {
      vi: body.titleVi ?? guide.title.vi,
      en: body.titleEn ?? guide.title.en,
    };
  }
  if (body.subtitleVi || body.subtitleEn) {
    guide.subtitle = {
      vi: body.subtitleVi ?? guide.subtitle.vi,
      en: body.subtitleEn ?? guide.subtitle.en,
    };
  }
  if (body.sourceTitle !== undefined) guide.sourceTitle = body.sourceTitle || undefined;
  if (body.attribution !== undefined) guide.attribution = body.attribution || undefined;
  if (body.sourceUrl !== undefined) guide.sourceUrl = body.sourceUrl || undefined;
  if (body.published !== undefined) guide.published = body.published;

  const file = req.file;
  if (file) {
    if (file.mimetype !== "application/pdf" && !file.originalname.toLowerCase().endsWith(".pdf")) {
      throw new AppError(400, "Only PDF files are allowed");
    }
    const oldKey = guide.storageKey;
    const oldCloud = guide.cloudinaryPublicId;
    const storageKey = makeStorageKey(guide.slug);
    saveGuidePdf(storageKey, file.buffer);
    guide.storageKey = storageKey;
    const uploaded = await optionalCloudinaryUpload(file.buffer, file.originalname || guide.slug);
    if (uploaded) guide.cloudinaryPublicId = uploaded.publicId;
    deleteGuidePdf(oldKey);
    if (oldCloud) await destroyGuideAsset(oldCloud);
  }

  guide.pdfUrl = guideFilePath(guide.slug);
  await guide.save();
  res.json({ guide: toPublicGuide(guide) });
}

export async function deleteGuide(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const guide = await Guide.findById(id);
  if (!guide) throw new AppError(404, "Guide not found");

  deleteGuidePdf(guide.storageKey);
  if (guide.cloudinaryPublicId) await destroyGuideAsset(guide.cloudinaryPublicId);
  await guide.deleteOne();
  res.json({ ok: true });
}
