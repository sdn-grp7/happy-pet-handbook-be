/**
 * Rewrite forum comments to sound like real pet-owner replies.
 * Usage: npx tsx scripts/fix-forum-comments.ts
 */
import "dotenv/config";
import mongoose from "mongoose";
import { env } from "../src/config/env.js";
import { Comment, Post } from "../src/features/community/model.js";
import { User } from "../src/features/auth/model.js";

const REPLIES = [
  "Tuần đầu mình để khay cát gần chỗ bé hay nằm, ăn 3–4 bữa nhỏ. Bé quen nhanh hơn mình nghĩ.",
  "Mình chuyển mixed cũng theo lịch 7 ngày: ngày 1–2 chỉ 20% pate, tăng dần. Nhớ cho uống đủ nước nhé.",
  "Với kéo dây, mình dùng treat nhỏ + lệnh “nhìn đây”. Mỗi lần bé nhìn sen là thưởng ngay, hiệu quả rõ sau 1 tuần.",
  "Ủ rũ nửa ngày sau tiêm khá phổ biến. Theo dõi ăn uống, nếu quá 24h hoặc sốt thì nên đưa đi khám.",
  "Boss nhà mình cũng ngủ kiểu “chớp mắt cái dậy quậy”. Chuẩn pet energy luôn.",
  "Checklist của bạn ổn rồi. Mình thêm: đồ chơi mài móng + lịch tái khám sau 2 tuần nhận nuôi.",
  "Ức gà luộc không xương được, nhưng chỉ topping khoảng 10–15% khẩu phần thôi, đừng thay hẳn hạt.",
  "5 giây “ngồi–chờ” là tiến bộ thật đó. Giữ session ngắn, kết thúc khi bé còn muốn chơi.",
  "Mình hay gửi bé tới phòng gần Cầu Giấy, bác sĩ giải thích dễ hiểu. Bạn search thêm review gần nhà cũng được.",
  "Tuần đầu về nhà mà đã đòi ôm là dấu hiệu tốt lắm. Kiên trì routine ngủ/ăn giúp bé ổn định hơn.",
  "Mèo indoor mình cắt móng khoảng 2–3 tuần/lần, chỉ cắt phần trong suốt, tránh sát phần hồng.",
  "Pate mở rồi tủ lạnh mình dùng trong 24–48h, chia hộp kín. Lâu hơn là bỏ cho chắc.",
  "Cảm ơn tip này, mình sẽ thử từ tối nay luôn.",
  "Đồng ý với bạn — quan sát thêm 1–2 ngày rồi quyết định có cần khám không.",
  "Bé nhà mình hồi trước cũng vậy, kiên nhẫn thêm tuần là đỡ hẳn.",
  "Bạn cho xin tên hạt/pate đang dùng được không? Để so với lịch nhà mình.",
];

function looksFake(content: string) {
  const raw = content.trim().toLowerCase();
  return (
    raw.includes("tên hiển thị") ||
    raw.includes("ghép với") ||
    raw.includes("placeholder") ||
    raw.includes("lorem") ||
    raw.includes("test comment") ||
    raw.includes("bình luận mẫu") ||
    raw.includes("comment mẫu") ||
    raw.length < 8
  );
}

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  console.log("MongoDB connected");

  const posts = await Post.find({}).sort({ createdAt: -1 });
  const users = await User.find({}).select({ _id: 1, name: 1 }).lean();
  if (users.length === 0) throw new Error("No users found to attach comments");

  let updated = 0;
  let created = 0;

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const existing = await Comment.find({ postId: post._id }).sort({ createdAt: 1 });

    if (existing.length === 0) {
      const count = 2 + (i % 3); // 2..4 comments
      for (let j = 0; j < count; j++) {
        const author = users[(i + j + 1) % users.length];
        const content = REPLIES[(i * 3 + j) % REPLIES.length];
        await Comment.create({
          postId: post._id,
          userId: author._id,
          content,
          createdAt: new Date(Date.now() - (count - j) * 3600_000 * (i + 1)),
        });
        created += 1;
      }
      // keep denormalized count in sync if field exists on reads via aggregation;
      // some deployments may store commentsCount on post — update if present.
      if ("commentsCount" in post) {
        (post as { commentsCount?: number }).commentsCount = count;
        await post.save();
      }
      console.log(`  post ${post._id}: created ${count} comments`);
      continue;
    }

    for (let j = 0; j < existing.length; j++) {
      const comment = existing[j];
      if (!looksFake(comment.content) && comment.content.length >= 20) continue;
      comment.content = REPLIES[(i * 5 + j) % REPLIES.length];
      await comment.save();
      updated += 1;
      console.log(`  comment ${comment._id}: rewritten`);
    }
  }

  // Force-rewrite ALL comments to curated replies for a consistent demo feed.
  const all = await Comment.find({}).sort({ createdAt: 1 });
  for (let i = 0; i < all.length; i++) {
    const next = REPLIES[i % REPLIES.length];
    if (all[i].content === next) continue;
    all[i].content = next;
    await all[i].save();
    updated += 1;
  }

  console.log(`Done. created=${created}, rewritten=${updated}, totalComments=${all.length}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
