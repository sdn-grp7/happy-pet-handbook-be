import type { AdoptionRequestDocument } from "./model.js";

type LeanRequest = {
  _id: { toString(): string };
  petId: { toString(): string };
  petName: string;
  petCode?: string | null;
  petImage?: string | null;
  adopterId: { toString(): string };
  adopterName: string;
  adopterAvatar?: string | null;
  message?: string | null;
  status: "pending" | "approved" | "rejected";
  ownerId?: { toString(): string } | null;
  ownerName?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function toPublicAdoptionRequest(doc: LeanRequest | AdoptionRequestDocument) {
  return {
    id: doc._id.toString(),
    petId: doc.petId.toString(),
    petName: doc.petName,
    petCode: doc.petCode ?? "",
    ...(doc.petImage ? { petImage: doc.petImage } : {}),
    adopterId: doc.adopterId.toString(),
    adopterName: doc.adopterName,
    ...(doc.adopterAvatar ? { adopterAvatar: doc.adopterAvatar } : {}),
    message: doc.message ?? "",
    status: doc.status,
    ...(doc.ownerId ? { ownerId: doc.ownerId.toString() } : {}),
    ...(doc.ownerName ? { ownerName: doc.ownerName } : {}),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export type PublicAdoptionRequest = ReturnType<typeof toPublicAdoptionRequest>;
