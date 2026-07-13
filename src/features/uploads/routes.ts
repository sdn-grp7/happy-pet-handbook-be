import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../auth/middleware.js";
import * as uploadsController from "./controller.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image uploads are allowed"));
      return;
    }
    cb(null, true);
  },
});

const router = Router();

router.post("/image", requireAuth, upload.single("file"), uploadsController.uploadImage);

export default router;
