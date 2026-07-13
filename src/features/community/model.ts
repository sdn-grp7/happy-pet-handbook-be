import mongoose, { Schema, type InferSchemaType } from "mongoose";

const postSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    content: { type: String, required: true, trim: true },
    imageUrls: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    likesCount: { type: Number, default: 0, min: 0 },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  {
    collection: "posts",
    versionKey: false,
  },
);

postSchema.index({ createdAt: -1, _id: -1 });
postSchema.index({ userId: 1, createdAt: -1 });
postSchema.index({ tags: 1, createdAt: -1 });

const commentSchema = new Schema(
  {
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    content: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  {
    collection: "comments",
    versionKey: false,
  },
);

commentSchema.index({ postId: 1, createdAt: -1 });
commentSchema.index({ userId: 1, createdAt: -1 });

export type PostDocument = InferSchemaType<typeof postSchema> & {
  _id: mongoose.Types.ObjectId;
};

export type CommentDocument = InferSchemaType<typeof commentSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Post = mongoose.model("Post", postSchema);
export const Comment = mongoose.model("Comment", commentSchema);
