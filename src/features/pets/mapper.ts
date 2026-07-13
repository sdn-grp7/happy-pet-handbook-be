import { formatAgeLabel, parseAgeToMonths } from "./age.js";
import mongoose from "mongoose";

type ObjectIdLike = { toString(): string };

type UserRefDoc = {
  userId: ObjectIdLike;
  name: string;
  avatar?: string | null;
};

type VaccinationDoc = {
  _id?: ObjectIdLike;
  name: string;
  date: string;
  nextDue?: string | null;
  notes?: string | null;
  photoUrl?: string | null;
  uploadedBy: UserRefDoc;
  uploadedAt?: Date | null;
};

type CheckInDoc = {
  _id?: ObjectIdLike;
  photoUrl: string;
  caption: string;
  date?: string | null;
  uploadedBy: UserRefDoc;
};

export type OwnerDoc = {
  _id?: ObjectIdLike;
  user: UserRefDoc;
  from: string;
  to?: string | null;
  note?: string | null;
  checkIns?: CheckInDoc[];
};

export type PetLean = {
  _id: ObjectIdLike;
  code: string;
  name: string;
  species: "dog" | "cat";
  breed: string;
  gender: "male" | "female" | "unknown";
  ageMonths?: number | null;
  age: string;
  weightKg?: number | null;
  healthStatus: string;
  intakeYear?: number | null;
  description?: string | null;
  notes?: string | null;
  images?: string[];
  status: "available" | "pending" | "adopted";
  adoptedBy?: UserRefDoc | null;
  vaccinations?: VaccinationDoc[];
  owners?: OwnerDoc[];
  zaloPhone?: string | null;
  postedById: ObjectIdLike;
  postedByName: string;
  pickup?: {
    address: string;
    lat?: number | null;
    lng?: number | null;
  } | null;
  createdAt?: Date;
  updatedAt?: Date;
};

function toUserRef(ref: UserRefDoc) {
  return {
    id: ref.userId.toString(),
    name: ref.name,
    ...(ref.avatar ? { avatar: ref.avatar } : {}),
  };
}

export function toPublicPet(doc: PetLean, owners: OwnerDoc[] = []) {
  const ageMonths = doc.ageMonths ?? parseAgeToMonths(doc.age) ?? 12;
  return {
    id: doc._id.toString(),
    code: doc.code,
    name: doc.name,
    species: doc.species,
    breed: doc.breed,
    gender: doc.gender,
    ageMonths,
    age: formatAgeLabel(ageMonths),
    ...(doc.weightKg != null ? { weightKg: doc.weightKg } : {}),
    healthStatus: doc.healthStatus,
    ...(doc.intakeYear != null ? { intakeYear: doc.intakeYear } : {}),
    ...(doc.description ? { description: doc.description } : {}),
    ...(doc.notes ? { notes: doc.notes } : {}),
    images: doc.images ?? [],
    status: doc.status,
    ...(doc.adoptedBy ? { adoptedBy: toUserRef(doc.adoptedBy) } : {}),
    vaccinations: (doc.vaccinations ?? []).map((v) => ({
      name: v.name,
      date: v.date,
      ...(v.nextDue ? { nextDue: v.nextDue } : {}),
      ...(v.notes ? { notes: v.notes } : {}),
      ...(v.photoUrl ? { photoUrl: v.photoUrl } : {}),
      uploadedBy: toUserRef(v.uploadedBy),
      ...(v.uploadedAt ? { uploadedAt: v.uploadedAt.toISOString() } : {}),
    })),
    owners: owners.map((o) => ({
      id: o._id?.toString() ?? "",
      user: toUserRef(o.user),
      from: o.from,
      ...(o.to ? { to: o.to } : {}),
      ...(o.note ? { note: o.note } : {}),
      checkIns: (o.checkIns ?? [])
        .map((c) => ({
          id: c._id?.toString() ?? "",
          photoUrl: c.photoUrl,
          caption: c.caption,
          ...(c.date ? { date: c.date } : {}),
          uploadedBy: toUserRef(c.uploadedBy),
        }))
        .sort((a, b) => {
          if (!a.date && !b.date) return 0;
          if (!a.date) return 1;
          if (!b.date) return -1;
          return b.date.localeCompare(a.date);
        }),
    })),
    ...(doc.zaloPhone ? { zaloPhone: doc.zaloPhone } : {}),
    postedById: doc.postedById.toString(),
    postedByName: doc.postedByName,
    ...(doc.pickup
      ? {
          pickup: {
            address: doc.pickup.address,
            ...(doc.pickup.lat != null ? { lat: doc.pickup.lat } : {}),
            ...(doc.pickup.lng != null ? { lng: doc.pickup.lng } : {}),
          },
        }
      : {}),
    ...(doc.createdAt ? { createdAt: doc.createdAt.toISOString() } : {}),
    ...(doc.updatedAt ? { updatedAt: doc.updatedAt.toISOString() } : {}),
  };
}

export type PublicPet = ReturnType<typeof toPublicPet>;

export function isObjectIdString(id: string) {
  return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
}
