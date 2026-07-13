/**
 * Rewrite forum posts with clearer Vietnamese content, canonical tags, and pet photos.
 * Usage: npx tsx scripts/fix-forum-posts.ts
 */
import "dotenv/config";
import mongoose from "mongoose";
import { env } from "../src/config/env.js";
import { Post } from "../src/features/community/model.js";
import { Pet } from "../src/features/pets/model.js";

type Sample = {
  content: string;
  tags: string[];
};

const SAMPLES: Sample[] = [
  {
    tags: ["Basics"],
    content:
      "Sen mới nuôi lần đầu nên hỏi: tuần đầu về nhà, các bạn cho bé ăn mấy bữa và để khay cát chỗ nào để bé quen nhanh nhất?",
  },
  {
    tags: ["Nutrition"],
    content:
      "Mình đang chuyển từ hạt sang mixed (hạt + pate). Có sen nào share tỉ lệ và lịch chuyển dần 7–10 ngày không bị rối tiêu hóa không ạ?",
  },
  {
    tags: ["Training"],
    content:
      "Bé mình kéo dây khá mạnh khi gặp chó khác. Mọi người dùng clicker hay treat nào hiệu quả để dạy “nhìn sen” khi đi dạo?",
  },
  {
    tags: ["Health"],
    content:
      "Sau tiêm mũi 5-in-1, bé hơi ủ rũ nửa ngày rồi lại chơi. Đây có phải phản ứng bình thường không, hay cần đưa đi khám ngay?",
  },
  {
    tags: ["Stories"],
    content:
      "Hôm nay bé ngủ úp mặt vào gối đúng 10 phút rồi dậy đòi chơi. Ai cũng có boss nhà kiểu “ngủ ngắn nhưng quậy dài” không 😂",
  },
  {
    tags: ["Basics", "Health"],
    content:
      "Checklist nhận nuôi mình hay dùng: sổ tiêm, xét nghiệm FeLV/FIV (mèo), lịch tẩy giun, và ảnh toàn thân. Sen nào bổ sung thêm mục nào hữu ích không?",
  },
  {
    tags: ["Nutrition", "Basics"],
    content:
      "Bé 4 tháng cân 2.1kg, đang ăn hạt puppy. Có nên thêm ức gà luộc không xương không, và lượng khoảng bao nhiêu mỗi ngày thì hợp lý?",
  },
  {
    tags: ["Training", "Stories"],
    content:
      "Sau 2 tuần luyện “ngồi – chờ”, hôm nay bé giữ được gần 5 giây trước khi nhận treat. Nhỏ thôi nhưng mình vui cả buổi 🫶",
  },
  {
    tags: ["Health"],
    content:
      "Sen nào ở Hà Nội recommend phòng khám tiêm phòng + siêu âm định kỳ tin được không? Ưu tiên sạch sẽ, bác sĩ giải thích dễ hiểu.",
  },
  {
    tags: ["Stories"],
    content:
      "Bé mới nhận nuôi tuần trước, đêm đầu hơi run nhưng sáng nay đã leo lên ghế đòi ôm. Cảm ơn cộng đồng đã góp ý chuẩn bị nhà trước khi đón bé!",
  },
  {
    tags: ["Basics"],
    content:
      "Nên cắt móng bao lâu một lần với mèo indoor? Mình cắt quá sát lần trước bị chảy tí máu, sợ lần sau bé sợ kéo dài.",
  },
  {
    tags: ["Nutrition"],
    content:
      "Pate hộp mở rồi để tủ lạnh được tối đa bao lâu mọi người hay dùng? Mình đang chia 2–3 phần trong ngày cho đỡ lãng phí.",
  },
];

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  console.log("MongoDB connected");

  const posts = await Post.find({}).sort({ createdAt: -1 });
  const pets = await Pet.find({ "images.0": { $exists: true } })
    .select({ images: 1, name: 1 })
    .lean();
  const photoPool = pets.flatMap((p) => (p.images ?? []).slice(0, 1)).filter(Boolean);

  let updated = 0;
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const sample = SAMPLES[i % SAMPLES.length];
    const image =
      photoPool.length > 0
        ? [photoPool[i % photoPool.length]]
        : (post.imageUrls?.slice(0, 1) ?? []);

    post.content = sample.content;
    post.tags = sample.tags;
    post.imageUrls = image;
    await post.save();
    updated += 1;
    console.log(`  ${post._id}: [${sample.tags.join(", ")}] ${sample.content.slice(0, 48)}…`);
  }

  console.log(`Done. Updated ${updated} posts.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
