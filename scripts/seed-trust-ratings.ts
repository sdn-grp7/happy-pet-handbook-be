/**
 * Rebuilds linked ownership history on adopted pets and seeds trust ratings.
 *
 * Each adopted pet gets a chronological chain in OwnershipHistory:
 *   prior1 (closed) → prior2 (closed) → current adopter (open)
 * Then every prior owner rates the CURRENT adopter (same petId).
 *
 * Usage: npx tsx scripts/seed-trust-ratings.ts
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { env } from "../src/config/env.js";
import { User } from "../src/features/auth/model.js";
import { replaceOwnershipChain } from "../src/features/ownership/service.js";
import { Pet } from "../src/features/pets/model.js";
import { TrustRating } from "../src/features/reputation/model.js";

const PRIOR_POOL = [
  { name: "Lê Văn Hùng", email: "hung.prior@example.com" },
  { name: "Phạm Thị Mai", email: "mai.prior@example.com" },
  { name: "Nguyễn Đức Thành", email: "thanh.prior@example.com" },
  { name: "Trần Bảo Ngọc", email: "ngoc.prior@example.com" },
  { name: "Hoàng Anh Tuấn", email: "tuan.prior@example.com" },
  { name: "Đỗ Minh Châu", email: "chau.prior@example.com" },
  { name: "Võ Quang Khoa", email: "khoa.prior@example.com" },
  { name: "Bùi Hải Yến", email: "yen.prior@example.com" },
];

const COMMENTS = [
  "Mình từng nuôi bé trước khi bàn giao — chủ mới chăm rất tận tâm.",
  "Đã nuôi bé một thời gian; thấy người nhận nuôi hiện tại phù hợp.",
  "Handoff rõ ràng, chủ mới hỏi kỹ về tính cách và lịch tiêm của bé.",
  "Tin tưởng giao bé tiếp — cập nhật tình hình đều đặn.",
  "Bé từng ở nhà mình; chủ đang nuôi xử lý bàn giao rất chuyên nghiệp.",
  "Có kinh nghiệm, nhà cửa sẵn sàng — yên tâm để bé ở lại.",
];

const PASSWORD = "12345678";

type UserDoc = InstanceType<typeof User>;

async function ensureUsers() {
  const password = await bcrypt.hash(PASSWORD, 12);
  const users: UserDoc[] = [];
  for (const sample of PRIOR_POOL) {
    let user = await User.findOne({ email: sample.email });
    if (!user) {
      user = await User.create({
        name: sample.name,
        email: sample.email,
        password,
        role: "user",
      });
      console.log(`+ ${user.name}`);
    } else {
      console.log(`= ${user.name}`);
    }
    users.push(user);
  }
  return users;
}

function refOf(user: UserDoc) {
  return {
    userId: user._id as mongoose.Types.ObjectId,
    name: user.name,
    avatar: user.avatar,
  };
}

function pickPriors(pool: UserDoc[], adopterId: string, petIndex: number) {
  const available = pool.filter((u) => u._id.toString() !== adopterId);
  const a = available[petIndex % available.length];
  const b = available[(petIndex + 3) % available.length];
  if (a._id.toString() === b._id.toString()) {
    const alt = available[(petIndex + 1) % available.length];
    return [a, alt._id.toString() !== a._id.toString() ? alt : a] as const;
  }
  return [a, b] as const;
}

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  console.log("MongoDB connected");

  const priorPool = await ensureUsers();
  const pets = await Pet.find({
    status: "adopted",
    adoptedBy: { $exists: true, $ne: null },
  });
  console.log(`Adopted pets: ${pets.length}`);

  const petIds = pets.map((p) => p._id);
  const deleted = await TrustRating.deleteMany({ petId: { $in: petIds } });
  console.log(`Cleared ${deleted.deletedCount} old ratings for these pets`);

  let chains = 0;
  let ratings = 0;

  for (let i = 0; i < pets.length; i++) {
    const pet = pets[i];
    const adopterId = pet.adoptedBy!.userId.toString();
    const [prior1, prior2] = pickPriors(priorPool, adopterId, i);

    await replaceOwnershipChain(pet._id, [
      { user: refOf(prior1), from: "2023-03-01", to: "2024-08-15" },
      { user: refOf(prior2), from: "2024-08-15", to: "2025-06-01" },
      {
        user: {
          userId: pet.adoptedBy!.userId as mongoose.Types.ObjectId,
          name: pet.adoptedBy!.name,
          avatar: pet.adoptedBy!.avatar,
        },
        from: "2025-06-01",
      },
    ]);

    pet.owners = [] as typeof pet.owners;
    await pet.save();
    chains += 1;

    const priors = [prior1, prior2].filter(
      (u, idx, arr) => arr.findIndex((x) => x._id.toString() === u._id.toString()) === idx,
    );

    for (let p = 0; p < priors.length; p++) {
      const reviewer = priors[p];
      const rating = 3 + ((i + p) % 3);
      const comment = COMMENTS[(i + p) % COMMENTS.length];

      await TrustRating.create({
        petId: pet._id,
        reviewerId: reviewer._id,
        revieweeId: pet.adoptedBy!.userId,
        rating,
        comment,
      });
      ratings += 1;
    }

    console.log(
      `  ${pet.code} ${pet.name}: ${prior1.name} → ${prior2.name} → ${pet.adoptedBy!.name} (${priors.length} reviews)`,
    );
  }

  console.log(`Done. chains=${chains}, ratings=${ratings}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
