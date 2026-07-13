import type { Request, Response } from "express";
import mongoose from "mongoose";
import { AppError } from "../../shared/errors.js";
import { User } from "../auth/model.js";
import { OwnershipHistory } from "../ownership/model.js";
import { Pet } from "../pets/model.js";
import { getTrustSummary } from "./aggregate.js";
import {
  canPriorOwnerRateSuccessor,
  listRateableSuccessors,
  loadPetOwnershipView,
} from "./eligibility.js";
import { toPublicReview, toReputationSummary, type TrustRatingLean } from "./mapper.js";
import { TrustRating } from "./model.js";
import type { UpsertRatingBody } from "./schemas.js";

export { getTrustSummary };

export async function listReputation(_req: Request, res: Response) {
  const rows = await TrustRating.aggregate<{
    _id: mongoose.Types.ObjectId;
    avg: number;
    count: number;
  }>([
    {
      $group: {
        _id: "$revieweeId",
        avg: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gte: 1 } } },
    { $sort: { avg: -1, count: -1 } },
  ]);

  const userIds = rows.map((r) => r._id);
  const users = await User.find({ _id: { $in: userIds } }).lean();
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const reviewsByUser = await TrustRating.find({ revieweeId: { $in: userIds } })
    .sort({ createdAt: -1 })
    .lean();

  const petIds = [...new Set(reviewsByUser.map((r) => r.petId.toString()))];
  const reviewerIds = [...new Set(reviewsByUser.map((r) => r.reviewerId.toString()))];
  const [pets, reviewers] = await Promise.all([
    Pet.find({ _id: { $in: petIds } })
      .select("name code images")
      .lean(),
    User.find({ _id: { $in: reviewerIds } })
      .select("name avatar")
      .lean(),
  ]);
  const petMap = new Map(pets.map((p) => [p._id.toString(), p]));
  const reviewerMap = new Map(reviewers.map((u) => [u._id.toString(), u]));

  const reviewsGrouped = new Map<string, ReturnType<typeof toPublicReview>[]>();
  for (const r of reviewsByUser) {
    const revieweeId = r.revieweeId.toString();
    const pet = petMap.get(r.petId.toString());
    const reviewer = reviewerMap.get(r.reviewerId.toString());
    const review = toPublicReview(r as TrustRatingLean, {
      reviewerName: reviewer?.name ?? "User",
      ...(reviewer?.avatar ? { reviewerAvatar: reviewer.avatar } : {}),
      petName: pet?.name ?? "Pet",
      petCode: pet?.code ?? "",
      ...(pet?.images?.[0] ? { petImage: pet.images[0] } : {}),
    });
    const list = reviewsGrouped.get(revieweeId) ?? [];
    list.push(review);
    reviewsGrouped.set(revieweeId, list);
  }

  const profiles = rows
    .map((row) => {
      const user = userMap.get(row._id.toString());
      if (!user) return null;
      return {
        ...toReputationSummary(user._id.toString(), user.name, user.avatar ?? undefined, {
          avg: row.avg,
          count: row.count,
        }),
        reviews: reviewsGrouped.get(row._id.toString()) ?? [],
      };
    })
    .filter(Boolean);

  res.json({ profiles });
}

export async function getUserReputation(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const user = await User.findById(id).lean();
  if (!user) throw new AppError(404, "User not found");

  const summary = await getTrustSummary(id);
  const ratings = await TrustRating.find({ revieweeId: id }).sort({ createdAt: -1 }).lean();

  const petIds = [...new Set(ratings.map((r) => r.petId.toString()))];
  const reviewerIds = [...new Set(ratings.map((r) => r.reviewerId.toString()))];
  const [pets, reviewers] = await Promise.all([
    Pet.find({ _id: { $in: petIds } })
      .select("name code images")
      .lean(),
    User.find({ _id: { $in: reviewerIds } })
      .select("name avatar")
      .lean(),
  ]);
  const petMap = new Map(pets.map((p) => [p._id.toString(), p]));
  const reviewerMap = new Map(reviewers.map((u) => [u._id.toString(), u]));

  const reviews = ratings.map((r) => {
    const pet = petMap.get(r.petId.toString());
    const reviewer = reviewerMap.get(r.reviewerId.toString());
    return toPublicReview(r as TrustRatingLean, {
      reviewerName: reviewer?.name ?? "User",
      ...(reviewer?.avatar ? { reviewerAvatar: reviewer.avatar } : {}),
      petName: pet?.name ?? "Pet",
      petCode: pet?.code ?? "",
      ...(pet?.images?.[0] ? { petImage: pet.images[0] } : {}),
    });
  });

  res.json({
    profile: {
      userId: user._id.toString(),
      userName: user.name,
      ...(user.avatar ? { avatar: user.avatar } : {}),
      trustScore: summary.trustScore,
      reviewCount: summary.reviewCount,
      reviews,
    },
  });
}

export async function listPendingRatings(req: Request, res: Response) {
  const reviewerId = req.user!.userId;
  const reviewerOid = new mongoose.Types.ObjectId(reviewerId);

  const historyRows = await OwnershipHistory.find({
    "user.userId": reviewerOid,
    to: { $exists: true, $nin: [null, ""] },
  })
    .select("petId")
    .lean();
  const petIds = [...new Set(historyRows.map((h) => h.petId.toString()))].map(
    (id) => new mongoose.Types.ObjectId(id),
  );

  const pets = await Pet.find({ _id: { $in: petIds } }).lean();

  const pending: {
    petId: string;
    petName: string;
    petCode: string;
    revieweeId: string;
    revieweeName: string;
    revieweeAvatar?: string;
    existingRating?: {
      id: string;
      rating: number;
      comment?: string;
    };
  }[] = [];

  for (const pet of pets) {
    const view = await loadPetOwnershipView(pet._id, pet.adoptedBy ?? null);
    const successors = listRateableSuccessors(view, reviewerId);
    for (const s of successors) {
      const existing = await TrustRating.findOne({
        petId: pet._id,
        reviewerId,
        revieweeId: s.revieweeId,
      }).lean();

      pending.push({
        petId: pet._id.toString(),
        petName: pet.name,
        petCode: pet.code,
        revieweeId: s.revieweeId,
        revieweeName: s.revieweeName,
        ...(s.revieweeAvatar ? { revieweeAvatar: s.revieweeAvatar } : {}),
        ...(existing
          ? {
              existingRating: {
                id: existing._id.toString(),
                rating: existing.rating,
                ...(existing.comment ? { comment: existing.comment } : {}),
              },
            }
          : {}),
      });
    }
  }

  res.json({ pending });
}

export async function upsertRating(req: Request, res: Response) {
  const body = req.body as UpsertRatingBody;
  const reviewerId = req.user!.userId;

  if (reviewerId === body.revieweeId) {
    throw new AppError(400, "You cannot rate yourself");
  }

  const pet = await Pet.findById(body.petId);
  if (!pet) throw new AppError(404, "Pet not found");

  const view = await loadPetOwnershipView(pet._id, pet.adoptedBy ?? null);
  if (!canPriorOwnerRateSuccessor(view, reviewerId, body.revieweeId)) {
    throw new AppError(
      403,
      "Only a prior owner of this pet can rate the new owner",
    );
  }

  const reviewee = await User.findById(body.revieweeId).lean();
  if (!reviewee) throw new AppError(404, "Reviewee user not found");

  const rating = await TrustRating.findOneAndUpdate(
    {
      petId: pet._id,
      reviewerId,
      revieweeId: body.revieweeId,
    },
    {
      $set: {
        rating: body.rating,
        comment: body.comment?.trim() || undefined,
      },
      $setOnInsert: {
        petId: pet._id,
        reviewerId,
        revieweeId: body.revieweeId,
      },
    },
    { upsert: true, new: true, runValidators: true },
  );

  const reviewer = await User.findById(reviewerId).lean();

  res.status(200).json({
    review: toPublicReview(rating!.toObject() as TrustRatingLean, {
      reviewerName: reviewer?.name ?? "User",
      ...(reviewer?.avatar ? { reviewerAvatar: reviewer.avatar } : {}),
      petName: pet.name,
      petCode: pet.code,
      ...(pet.images?.[0] ? { petImage: pet.images[0] } : {}),
    }),
  });
}
