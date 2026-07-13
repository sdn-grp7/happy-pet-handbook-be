import mongoose, { Schema, type InferSchemaType } from "mongoose";

const localizedSchema = new Schema(
  {
    vi: { type: String, required: true, trim: true },
    en: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const guideSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    chapter: { type: Number, required: true, min: 1 },
    title: { type: localizedSchema, required: true },
    subtitle: { type: localizedSchema, required: true },
    pdfUrl: { type: String, required: true },
    /** Local filename under uploads/guides/ — used for delivery (Cloudinary PDF CDN is often 401). */
    storageKey: { type: String, required: true },
    cloudinaryPublicId: { type: String, default: "" },
    sourceTitle: { type: String, trim: true },
    attribution: { type: String, trim: true },
    sourceUrl: { type: String, trim: true },
    published: { type: Boolean, default: true },
  },
  { timestamps: true },
);

guideSchema.index({ chapter: 1 });

export type GuideDocument = InferSchemaType<typeof guideSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Guide = mongoose.model("Guide", guideSchema);
