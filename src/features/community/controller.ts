import type { Request, Response } from "express";
import { fetchFeed } from "./service.js";
import type { FeedQuery } from "./schemas.js";

export async function getFeed(req: Request, res: Response) {
  const { skip, limit } = req.query as unknown as FeedQuery;
  const posts = await fetchFeed({ skip, limit });

  res.json({
    posts,
    pagination: {
      skip,
      limit,
      count: posts.length,
    },
  });
}
