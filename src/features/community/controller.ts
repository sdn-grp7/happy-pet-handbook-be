import type { Request, Response } from "express";
import { AppError } from "../../shared/errors.js";
import type {
  CommentsQuery,
  CreateCommentBody,
  CreatePostBody,
  FeedQuery,
  PostCommentParams,
  PostIdParams,
  UpdateCommentBody,
  UpdatePostBody,
} from "./schemas.js";
import {
  createComment,
  createPost,
  deleteComment,
  deletePost,
  fetchCommentById,
  fetchCommentsForPost,
  fetchFeed,
  fetchPostById,
  likePost,
  togglePostLike,
  unlikePost,
  updateComment,
  updatePost,
} from "./service.js";

export async function getFeed(req: Request, res: Response) {
  const { skip, limit } = req.query as unknown as FeedQuery;
  const posts = await fetchFeed({ skip, limit, currentUserId: req.user?.userId });

  res.json({
    posts,
    pagination: {
      skip,
      limit,
      count: posts.length,
    },
  });
}

export async function getPost(req: Request, res: Response) {
  const { postId } = req.params as PostIdParams;
  const post = await fetchPostById(postId, req.user?.userId);
  if (!post) throw new AppError(404, "Post not found");

  res.json({ post });
}

export async function createPostHandler(req: Request, res: Response) {
  const body = req.body as CreatePostBody;
  const post = await createPost(req.user!.userId, body);

  res.status(201).json({ post });
}

export async function updatePostHandler(req: Request, res: Response) {
  const { postId } = req.params as PostIdParams;
  const body = req.body as UpdatePostBody;
  const post = await updatePost(postId, req.user!.userId, body);

  res.json({ post });
}

export async function deletePostHandler(req: Request, res: Response) {
  const { postId } = req.params as PostIdParams;
  await deletePost(postId, req.user!.userId);

  res.json({ ok: true });
}

export async function likePostHandler(req: Request, res: Response) {
  const { postId } = req.params as PostIdParams;
  const post = await likePost(postId, req.user!.userId);

  res.json({
    post,
    likedByMe: post.likedByMe,
    likesCount: post.likesCount,
  });
}

export async function unlikePostHandler(req: Request, res: Response) {
  const { postId } = req.params as PostIdParams;
  const post = await unlikePost(postId, req.user!.userId);

  res.json({
    post,
    likedByMe: post.likedByMe,
    likesCount: post.likesCount,
  });
}

export async function togglePostLikeHandler(req: Request, res: Response) {
  const { postId } = req.params as PostIdParams;
  const post = await togglePostLike(postId, req.user!.userId);

  res.json({
    post,
    likedByMe: post.likedByMe,
    likesCount: post.likesCount,
  });
}

export async function listComments(req: Request, res: Response) {
  const { postId } = req.params as PostIdParams;
  const { skip, limit } = req.query as unknown as CommentsQuery;
  const comments = await fetchCommentsForPost(postId, { skip, limit });

  res.json({
    comments,
    pagination: {
      skip,
      limit,
      count: comments.length,
    },
  });
}

export async function getComment(req: Request, res: Response) {
  const { postId, commentId } = req.params as PostCommentParams;
  const comment = await fetchCommentById(postId, commentId);
  if (!comment) throw new AppError(404, "Comment not found");

  res.json({ comment });
}

export async function createCommentHandler(req: Request, res: Response) {
  const { postId } = req.params as PostIdParams;
  const body = req.body as CreateCommentBody;
  const comment = await createComment(postId, req.user!.userId, body);

  res.status(201).json({ comment });
}

export async function updateCommentHandler(req: Request, res: Response) {
  const { postId, commentId } = req.params as PostCommentParams;
  const body = req.body as UpdateCommentBody;
  const comment = await updateComment(postId, commentId, req.user!.userId, body);

  res.json({ comment });
}

export async function deleteCommentHandler(req: Request, res: Response) {
  const { postId, commentId } = req.params as PostCommentParams;
  await deleteComment(postId, commentId, req.user!.userId);

  res.json({ ok: true });
}
