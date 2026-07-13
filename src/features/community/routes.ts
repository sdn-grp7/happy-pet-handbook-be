import { Router } from "express";
import { validate } from "../../shared/middleware/validate.js";
import { optionalAuth, requireAuth } from "../auth/middleware.js";
import * as communityController from "./controller.js";
import {
  commentsQuerySchema,
  createCommentBodySchema,
  createPostBodySchema,
  feedQuerySchema,
  postCommentParamsSchema,
  postIdParamsSchema,
  updateCommentBodySchema,
  updatePostBodySchema,
} from "./schemas.js";

const router = Router();

router.get("/feed", optionalAuth, validate(feedQuerySchema, "query"), communityController.getFeed);
router.post("/", requireAuth, validate(createPostBodySchema), communityController.createPostHandler);

router.get(
  "/:postId/comments",
  validate(postIdParamsSchema, "params"),
  validate(commentsQuerySchema, "query"),
  communityController.listComments,
);
router.post(
  "/:postId/comments",
  requireAuth,
  validate(postIdParamsSchema, "params"),
  validate(createCommentBodySchema),
  communityController.createCommentHandler,
);
router.get(
  "/:postId/comments/:commentId",
  validate(postCommentParamsSchema, "params"),
  communityController.getComment,
);
router.patch(
  "/:postId/comments/:commentId",
  requireAuth,
  validate(postCommentParamsSchema, "params"),
  validate(updateCommentBodySchema),
  communityController.updateCommentHandler,
);
router.delete(
  "/:postId/comments/:commentId",
  requireAuth,
  validate(postCommentParamsSchema, "params"),
  communityController.deleteCommentHandler,
);

router.post(
  "/:postId/likes",
  requireAuth,
  validate(postIdParamsSchema, "params"),
  communityController.likePostHandler,
);
router.delete(
  "/:postId/likes",
  requireAuth,
  validate(postIdParamsSchema, "params"),
  communityController.unlikePostHandler,
);
router.post(
  "/:postId/likes/toggle",
  requireAuth,
  validate(postIdParamsSchema, "params"),
  communityController.togglePostLikeHandler,
);

router.get("/:postId", optionalAuth, validate(postIdParamsSchema, "params"), communityController.getPost);
router.patch(
  "/:postId",
  requireAuth,
  validate(postIdParamsSchema, "params"),
  validate(updatePostBodySchema),
  communityController.updatePostHandler,
);
router.delete(
  "/:postId",
  requireAuth,
  validate(postIdParamsSchema, "params"),
  communityController.deletePostHandler,
);

export default router;
