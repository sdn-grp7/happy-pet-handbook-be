import mongoose from "mongoose";
import { roundScore } from "./mapper.js";
import { TrustRating } from "./model.js";

export async function getTrustSummary(userId: string) {
  const rows = await TrustRating.aggregate<{ avg: number; count: number }>([
    { $match: { revieweeId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: "$revieweeId",
        avg: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);
  const agg = rows[0];
  return {
    trustScore: agg && agg.count > 0 ? roundScore(agg.avg) : 0,
    reviewCount: agg?.count ?? 0,
  };
}

export async function aggregateForUsers(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, { avg: number; count: number }>();
  const objectIds = userIds.map((id) => new mongoose.Types.ObjectId(id));
  const rows = await TrustRating.aggregate<{
    _id: mongoose.Types.ObjectId;
    avg: number;
    count: number;
  }>([
    { $match: { revieweeId: { $in: objectIds } } },
    {
      $group: {
        _id: "$revieweeId",
        avg: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);
  return new Map(rows.map((r) => [r._id.toString(), { avg: r.avg, count: r.count }]));
}
