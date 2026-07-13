import type { ObjectId } from "mongoose";

type ObjectIdLike = { toString(): string };

export type TrustRatingLean = {
  _id: ObjectIdLike;
  petId: ObjectIdLike;
  reviewerId: ObjectIdLike;
  revieweeId: ObjectIdLike;
  rating: number;
  comment?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function roundScore(avg: number) {
  return Math.round(avg * 10) / 10;
}

export function toPublicReview(
  doc: TrustRatingLean,
  meta: {
    reviewerName: string;
    reviewerAvatar?: string;
    petName: string;
    petCode: string;
    petImage?: string;
  },
) {
  return {
    id: doc._id.toString(),
    petId: doc.petId.toString(),
    petName: meta.petName,
    petCode: meta.petCode,
    ...(meta.petImage ? { petImage: meta.petImage } : {}),
    reviewerId: doc.reviewerId.toString(),
    reviewerName: meta.reviewerName,
    ...(meta.reviewerAvatar ? { reviewerAvatar: meta.reviewerAvatar } : {}),
    revieweeId: doc.revieweeId.toString(),
    rating: doc.rating,
    ...(doc.comment ? { comment: doc.comment } : {}),
    createdAt: doc.createdAt?.toISOString?.() ?? new Date().toISOString(),
  };
}

export type AggregateRow = {
  _id: ObjectId | ObjectIdLike;
  avg: number;
  count: number;
};

export function toReputationSummary(
  userId: string,
  userName: string,
  avatar: string | undefined,
  agg: { avg: number; count: number } | null,
) {
  return {
    userId,
    userName,
    ...(avatar ? { avatar } : {}),
    trustScore: agg && agg.count > 0 ? roundScore(agg.avg) : 0,
    reviewCount: agg?.count ?? 0,
  };
}
