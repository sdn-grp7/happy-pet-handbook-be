import mongoose, { Schema, type InferSchemaType } from "mongoose";

const userRefSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    avatar: { type: String },
  },
  { _id: false },
);

const vaccinationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    date: { type: String, required: true, trim: true },
    nextDue: { type: String, trim: true },
    notes: { type: String, trim: true },
    photoUrl: { type: String, trim: true },
    uploadedBy: { type: userRefSchema, required: true },
    uploadedAt: { type: Date },
  },
  { _id: true },
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

const ownerSchema = new Schema(
  {
    user: { type: userRefSchema, required: true },
    from: { type: String, required: true, trim: true },
    to: { type: String, trim: true },
    note: { type: String, trim: true },
    checkIns: { type: [checkInSchema], default: [] },
  },
  { _id: true },
);

const pickupSchema = new Schema(
  {
    address: { type: String, required: true, trim: true },
    lat: { type: Number },
    lng: { type: Number },
  },
  { _id: false },
);

const petSchema = new Schema(
  {
    /** Public listing code (e.g. SNNC SKU) shown to adopters */
    code: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    species: { type: String, enum: ["dog", "cat"], required: true },
    breed: { type: String, required: true, trim: true },
    gender: { type: String, enum: ["male", "female", "unknown"], required: true },
    age: { type: String, required: true, trim: true },
    weightKg: { type: Number },
    healthStatus: { type: String, required: true, trim: true },
    intakeYear: { type: Number },
    description: { type: String, trim: true },
    notes: { type: String, trim: true },
    images: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["available", "pending", "adopted"],
      default: "available",
    },
    vaccinations: { type: [vaccinationSchema], default: [] },
    owners: { type: [ownerSchema], default: [] },
    zaloPhone: { type: String, trim: true },
    postedById: { type: Schema.Types.ObjectId, ref: "User", required: true },
    postedByName: { type: String, required: true, trim: true },
    pickup: { type: pickupSchema },
  },
  { timestamps: true },
);

petSchema.index({ status: 1, species: 1 });
petSchema.index({ name: "text", breed: "text", description: "text" });

export type PetDocument = InferSchemaType<typeof petSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Pet = mongoose.model("Pet", petSchema);
