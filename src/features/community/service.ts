import mongoose, { type PipelineStage } from "mongoose";
import { AppError } from "../../shared/errors.js";
import { Comment, Post, PostLike } from "./model.js";
import type {
  CreateCommentBody,
  CreatePostBody,
  UpdateCommentBody,
  UpdatePostBody,
} from "./schemas.js";

export type FeedPost = {
  id: string;
  userId: string;
  content: string;
  imageUrls: string[];
  tags: string[];
  likesCount: number;
  likedByMe: boolean;
  commentsCount: number;
  createdAt: Date;
  authorDisplayName: string;
  author: {
    id: string | null;
    name: string | null;
    avatar?: string | null;
  };
};

export type FeedComment = {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: Date;
  authorDisplayName: string;
  author: {
    id: string | null;
    name: string | null;
    avatar?: string | null;
  };
};

type FetchOptions = {
  skip?: number;
  limit?: number;
  currentUserId?: string;
};

function toObjectId(id: string) {
  return new mongoose.Types.ObjectId(id);
}

function isOwner(ownerId: unknown, currentUserId: string) {
  return String(ownerId) === currentUserId;
}

function assertOwner(ownerId: unknown, currentUserId: string, resource: "post" | "comment") {
  if (!isOwner(ownerId, currentUserId)) {
    throw new AppError(403, `You can only update or delete your own ${resource}`);
  }
}

function authorStages(): PipelineStage[] {
  return [
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
      $addFields: {
        authorDisplayName: {
          $ifNull: ["$author.name", "Thành viên"],
        },
      },
    },
  ];
}

function postProjectionStage(): PipelineStage {
  return {
    $project: {
      _id: 0,
      id: { $toString: "$_id" },
      userId: { $toString: "$userId" },
      content: 1,
      imageUrls: 1,
      tags: 1,
      likesCount: 1,
      likedByMe: { $ifNull: ["$likedByMe", false] },
      commentsCount: 1,
      createdAt: 1,
      authorDisplayName: 1,
      author: {
        id: { $toString: "$author._id" },
        name: { $ifNull: ["$author.name", null] },
        avatar: { $ifNull: ["$author.avatar", null] },
      },
    },
  };
}

function commentProjectionStage(): PipelineStage {
  return {
    $project: {
      _id: 0,
      id: { $toString: "$_id" },
      postId: { $toString: "$postId" },
      userId: { $toString: "$userId" },
      content: 1,
      createdAt: 1,
      authorDisplayName: 1,
      author: {
        id: { $toString: "$author._id" },
        name: { $ifNull: ["$author.name", null] },
        avatar: { $ifNull: ["$author.avatar", null] },
      },
    },
  };
}

function postLikeStages(currentUserId?: string): PipelineStage[] {
  if (!currentUserId) {
    return [
      {
        $addFields: {
          likedByMe: false,
        },
      },
    ];
  }

  return [
    {
      $lookup: {
        from: "postlikes",
        let: { postId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ["$postId", "$$postId"],
                  },
                  {
                    $eq: ["$userId", toObjectId(currentUserId)],
                  },
                ],
              },
            },
          },
          {
            $limit: 1,
          },
          {
            $project: {
              _id: 1,
            },
          },
        ],
        as: "myPostLike",
      },
    },
    {
      $addFields: {
        likedByMe: {
          $gt: [{ $size: "$myPostLike" }, 0],
        },
      },
    },
  ];
}

function postReadStages(currentUserId?: string): PipelineStage[] {
  return [
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
      $addFields: {
        commentsCount: {
          $ifNull: [{ $arrayElemAt: ["$commentStats.count", 0] }, 0],
        },
      },
    },
    ...authorStages(),
    ...postLikeStages(currentUserId),
    postProjectionStage(),
  ];
}

function commentReadStages(): PipelineStage[] {
  return [...authorStages(), commentProjectionStage()];
}

export async function fetchFeed({ skip = 0, limit = 20, currentUserId }: FetchOptions = {}) {
  const safeSkip = Math.max(Number(skip) || 0, 0);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);

  return Post.aggregate<FeedPost>([
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
    ...postReadStages(currentUserId),
  ]);
}

export async function fetchPostById(postId: string, currentUserId?: string) {
  const [post] = await Post.aggregate<FeedPost>([
    {
      $match: {
        _id: toObjectId(postId),
      },
    },
    ...postReadStages(currentUserId),
  ]);

  return post ?? null;
}

export async function createPost(userId: string, body: CreatePostBody) {
  const post = await Post.create({
    userId: toObjectId(userId),
    content: body.content,
    imageUrls: body.imageUrls,
    tags: body.tags,
  });

  const created = await fetchPostById(post._id.toString(), userId);
  if (!created) throw new AppError(500, "Failed to create post");
  return created;
}

export async function updatePost(postId: string, userId: string, body: UpdatePostBody) {
  const post = await Post.findById(postId);
  if (!post) throw new AppError(404, "Post not found");
  assertOwner(post.userId, userId, "post");

  if (body.content !== undefined) post.content = body.content;
  if (body.imageUrls !== undefined) post.imageUrls = body.imageUrls;
  if (body.tags !== undefined) post.tags = body.tags;

  await post.save();

  const updated = await fetchPostById(postId, userId);
  if (!updated) throw new AppError(500, "Failed to update post");
  return updated;
}

export async function deletePost(postId: string, userId: string) {
  const post = await Post.findById(postId);
  if (!post) throw new AppError(404, "Post not found");
  assertOwner(post.userId, userId, "post");

  await Comment.deleteMany({ postId: post._id });
  await PostLike.deleteMany({ postId: post._id });
  await post.deleteOne();
}

export async function fetchCommentsForPost(
  postId: string,
  { skip = 0, limit = 20 }: FetchOptions = {},
) {
  const exists = await Post.exists({ _id: toObjectId(postId) });
  if (!exists) throw new AppError(404, "Post not found");

  const safeSkip = Math.max(Number(skip) || 0, 0);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

  return Comment.aggregate<FeedComment>([
    {
      $match: {
        postId: toObjectId(postId),
      },
    },
    {
      $sort: {
        createdAt: 1,
        _id: 1,
      },
    },
    {
      $skip: safeSkip,
    },
    {
      $limit: safeLimit,
    },
    ...commentReadStages(),
  ]);
}

export async function fetchCommentById(postId: string, commentId: string) {
  const [comment] = await Comment.aggregate<FeedComment>([
    {
      $match: {
        _id: toObjectId(commentId),
        postId: toObjectId(postId),
      },
    },
    ...commentReadStages(),
  ]);

  return comment ?? null;
}

export async function createComment(postId: string, userId: string, body: CreateCommentBody) {
  const exists = await Post.exists({ _id: toObjectId(postId) });
  if (!exists) throw new AppError(404, "Post not found");

  const comment = await Comment.create({
    postId: toObjectId(postId),
    userId: toObjectId(userId),
    content: body.content,
  });

  const created = await fetchCommentById(postId, comment._id.toString());
  if (!created) throw new AppError(500, "Failed to create comment");
  return created;
}

export async function updateComment(
  postId: string,
  commentId: string,
  userId: string,
  body: UpdateCommentBody,
) {
  const comment = await Comment.findOne({ _id: commentId, postId });
  if (!comment) throw new AppError(404, "Comment not found");
  assertOwner(comment.userId, userId, "comment");

  comment.content = body.content;
  await comment.save();

  const updated = await fetchCommentById(postId, commentId);
  if (!updated) throw new AppError(500, "Failed to update comment");
  return updated;
}

export async function deleteComment(postId: string, commentId: string, userId: string) {
  const comment = await Comment.findOne({ _id: commentId, postId });
  if (!comment) throw new AppError(404, "Comment not found");
  assertOwner(comment.userId, userId, "comment");

  await comment.deleteOne();
}

export async function likePost(postId: string, userId: string) {
  const postObjectId = toObjectId(postId);
  const userObjectId = toObjectId(userId);
  const exists = await Post.exists({ _id: postObjectId });
  if (!exists) throw new AppError(404, "Post not found");

  const result = await PostLike.updateOne(
    {
      postId: postObjectId,
      userId: userObjectId,
    },
    {
      $setOnInsert: {
        postId: postObjectId,
        userId: userObjectId,
        createdAt: new Date(),
      },
    },
    {
      upsert: true,
    },
  );

  if (result.upsertedCount > 0) {
    await Post.updateOne({ _id: postObjectId }, { $inc: { likesCount: 1 } });
  }

  const post = await fetchPostById(postId, userId);
  if (!post) throw new AppError(404, "Post not found");
  return post;
}

export async function unlikePost(postId: string, userId: string) {
  const postObjectId = toObjectId(postId);
  const userObjectId = toObjectId(userId);
  const exists = await Post.exists({ _id: postObjectId });
  if (!exists) throw new AppError(404, "Post not found");

  const result = await PostLike.deleteOne({
    postId: postObjectId,
    userId: userObjectId,
  });

  if (result.deletedCount > 0) {
    await Post.collection.updateOne({ _id: postObjectId }, [
      {
        $set: {
          likesCount: {
            $max: [0, { $subtract: [{ $ifNull: ["$likesCount", 0] }, 1] }],
          },
        },
      },
    ]);
  }

  const post = await fetchPostById(postId, userId);
  if (!post) throw new AppError(404, "Post not found");
  return post;
}

export async function togglePostLike(postId: string, userId: string) {
  const existing = await PostLike.exists({
    postId: toObjectId(postId),
    userId: toObjectId(userId),
  });

  return existing ? unlikePost(postId, userId) : likePost(postId, userId);
}
