import { mkdirSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const GUIDES_UPLOAD_DIR = join(__dirname, "../../../uploads/guides");

export function ensureGuidesUploadDir() {
  mkdirSync(GUIDES_UPLOAD_DIR, { recursive: true });
}

export function guideStoragePath(storageKey: string) {
  return join(GUIDES_UPLOAD_DIR, storageKey);
}

export function saveGuidePdf(storageKey: string, buffer: Buffer) {
  ensureGuidesUploadDir();
  writeFileSync(guideStoragePath(storageKey), buffer);
}

export function deleteGuidePdf(storageKey: string | null | undefined) {
  if (!storageKey) return;
  const path = guideStoragePath(storageKey);
  if (existsSync(path)) {
    try {
      unlinkSync(path);
    } catch (err) {
      console.warn("Failed to delete guide PDF:", path, err);
    }
  }
}

export function makeStorageKey(slug: string) {
  return `${slug}-${Date.now()}.pdf`;
}
