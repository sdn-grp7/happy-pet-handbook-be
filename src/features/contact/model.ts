import mongoose, { Schema, type InferSchemaType } from "mongoose";

const contactMessageSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    message: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

export type ContactMessageDocument = InferSchemaType<typeof contactMessageSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ContactMessage = mongoose.model("ContactMessage", contactMessageSchema);
