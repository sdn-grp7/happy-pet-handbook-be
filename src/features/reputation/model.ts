import mongoose, { Schema, type InferSchemaType } from "mongoose";

const trustRatingSchema = new Schema(
  {
    petId: { type: Schema.Types.ObjectId, ref: "Pet", required: true, index: true },
    reviewerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    revieweeId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true },
);

trustRatingSchema.index({ petId: 1, reviewerId: 1, revieweeId: 1 }, { unique: true });
trustRatingSchema.index({ revieweeId: 1, createdAt: -1 });

export type TrustRatingDocument = InferSchemaType<typeof trustRatingSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const TrustRating = mongoose.model("TrustRating", trustRatingSchema);
