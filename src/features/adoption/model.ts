import mongoose, { Schema, type InferSchemaType } from "mongoose";

const adoptionRequestSchema = new Schema(
  {
    petId: { type: Schema.Types.ObjectId, ref: "Pet", required: true, index: true },
    petName: { type: String, required: true, trim: true },
    petCode: { type: String, trim: true, default: "" },
    petImage: { type: String, trim: true },
    adopterId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    adopterName: { type: String, required: true, trim: true },
    adopterAvatar: { type: String, trim: true },
    message: { type: String, trim: true, maxlength: 2000, default: "" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    /** Snapshot of who could confirm at request time (current caretaker). */
    ownerId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    ownerName: { type: String, trim: true },
  },
  { timestamps: true },
);

adoptionRequestSchema.index({ petId: 1, adopterId: 1, status: 1 });
adoptionRequestSchema.index({ ownerId: 1, status: 1, createdAt: -1 });

export type AdoptionRequestDocument = InferSchemaType<typeof adoptionRequestSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const AdoptionRequest = mongoose.model("AdoptionRequest", adoptionRequestSchema);
