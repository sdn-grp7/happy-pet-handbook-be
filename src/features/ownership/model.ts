import mongoose, { Schema, type InferSchemaType } from "mongoose";

const userRefSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    avatar: { type: String },
  },
  { _id: false },
);

const checkInSchema = new Schema(
  {
    photoUrl: { type: String, required: true, trim: true },
    caption: { type: String, required: true, trim: true },
    date: { type: String, trim: true },
    uploadedBy: { type: userRefSchema, required: true },
  },
  { _id: true },
);

/**
 * One ownership period for a pet — source of truth for prior/current owners.
 * A pet may have many closed periods (chủ cũ) and at most one open (no `to`).
 */
const ownershipHistorySchema = new Schema(
  {
    petId: { type: Schema.Types.ObjectId, ref: "Pet", required: true, index: true },
    user: { type: userRefSchema, required: true },
    from: { type: String, required: true, trim: true },
    /** Missing = current / open ownership period. */
    to: { type: String, trim: true },
    note: { type: String, trim: true },
    checkIns: { type: [checkInSchema], default: [] },
  },
  { timestamps: true },
);

ownershipHistorySchema.index({ petId: 1, from: 1 });
ownershipHistorySchema.index({ "user.userId": 1, petId: 1 });
ownershipHistorySchema.index({ petId: 1, to: 1 });

export type OwnershipHistoryDocument = InferSchemaType<typeof ownershipHistorySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const OwnershipHistory = mongoose.model("OwnershipHistory", ownershipHistorySchema);
