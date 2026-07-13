import type { PipelineStage } from "mongoose";
import { Post } from "./model.js";

export type FeedPost = {
  id: string;
  userId: string;
  content: string;
  imageUrls: string[];
  tags: string[];
  likesCount: number;
  commentsCount: number;
  createdAt: Date;
  authorDisplayName: string;
  author: {
    id: string | null;
    name: string | null;
    avatar?: string | null;
  };
};

type FetchFeedOptions = {
  skip?: number;
  limit?: number;
};

export async function fetchFeed({ skip = 0, limit = 20 }: FetchFeedOptions = {}) {
  const safeSkip = Math.max(Number(skip) || 0, 0);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);

  const pipeline: PipelineStage[] = [
    {
      $sort: {
        createdAt: -1,
        _id: -1,
      },
    },
    {
      $skip: safeSkip,
    },
    {
      $limit: safeLimit,
    },
    {
      $lookup: {
        from: "comments",
        let: { postId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ["$postId", "$$postId"],
              },
            },
          },
          {
            $count: "count",
          },
        ],
        as: "commentStats",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "author",
      },
    },
    {
      $unwind: {
        path: "$author",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "pets",
        let: {
          authorId: "$userId",
          authorIdString: { $toString: "$userId" },
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $or: [
                  // Target shape requested for community pets.
                  { $eq: ["$userId", "$$authorId"] },
                  { $eq: [{ $toString: "$userId" }, "$$authorIdString"] },
                  // Compatibility with the existing pet documents in this codebase.
                  { $eq: ["$adoptedBy.user.userId", "$$authorId"] },
                  { $eq: [{ $toString: "$adoptedBy.user.userId" }, "$$authorIdString"] },
                  { $in: ["$$authorId", { $ifNull: ["$owners.user.userId", []] }] },
                  {
                    $in: [
                      "$$authorIdString",
                      {
                        $map: {
                          input: { $ifNull: ["$owners.user.userId", []] },
                          as: "ownerId",
                          in: { $toString: "$$ownerId" },
                        },
                      },
                    ],
                  },
                ],
              },
            },
          },
          {
            $sort: {
              createdAt: 1,
              _id: 1,
            },
          },
          {
            $limit: 1,
          },
          {
            $project: {
              _id: 1,
              name: 1,
            },
          },
        ],
        as: "authorPets",
      },
    },
    {
      $addFields: {
        commentsCount: {
          $ifNull: [{ $arrayElemAt: ["$commentStats.count", 0] }, 0],
        },
        firstAuthorPetName: {
          $arrayElemAt: ["$authorPets.name", 0],
        },
      },
    },
    {
      $addFields: {
        authorDisplayName: {
          $cond: [
            {
              $gt: [{ $size: "$authorPets" }, 0],
            },
            {
              $concat: ["$author.name", " & ", "$firstAuthorPetName"],
            },
            {
              $ifNull: ["$author.name", "Unknown User"],
            },
          ],
        },
      },
    },
    {
      $project: {
        _id: 0,
        id: { $toString: "$_id" },
        userId: { $toString: "$userId" },
        content: 1,
        imageUrls: 1,
        tags: 1,
        likesCount: 1,
        commentsCount: 1,
        createdAt: 1,
        authorDisplayName: 1,
        author: {
          id: { $toString: "$author._id" },
          name: { $ifNull: ["$author.name", null] },
          avatar: { $ifNull: ["$author.avatar", null] },
        },
      },
    },
  ];

  return Post.aggregate<FeedPost>(pipeline);
}
