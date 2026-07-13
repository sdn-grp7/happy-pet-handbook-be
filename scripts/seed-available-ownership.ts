/**
 * Seed ownership history for available / pending pets (listing still open).
 *
 * Chain: prior1 (closed) → prior2 (closed) → current caretaker = postedBy (open)
 *
 * Usage: npx tsx scripts/seed-available-ownership.ts
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { env } from "../src/config/env.js";
import { User } from "../src/features/auth/model.js";
import { replaceOwnershipChain } from "../src/features/ownership/service.js";
import { Pet } from "../src/features/pets/model.js";

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

const CAPTIONS = [
  "Bé ăn khỏe khi còn ở nhà mình.",
  "Check-in cuối trước khi bàn giao sang nơi tạm nuôi.",
  "Ảnh theo dõi — bé đã quen chuồng mới.",
  "Đi dạo buổi sáng, tính cách ổn định.",
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
    }
    users.push(user);
  }
  return users;
}

function refOf(user: { _id: mongoose.Types.ObjectId; name: string; avatar?: string | null }) {
  return {
    userId: user._id as mongoose.Types.ObjectId,
    name: user.name,
    avatar: user.avatar,
  };
}

function pickPriors(pool: UserDoc[], excludeId: string, petIndex: number) {
  const available = pool.filter((u) => u._id.toString() !== excludeId);
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
  const pets = await Pet.find({ status: { $in: ["available", "pending"] } });
  console.log(`Open listings: ${pets.length}`);

  let updated = 0;

  for (let i = 0; i < pets.length; i++) {
    const pet = pets[i];
    const posterId = pet.postedById?.toString() ?? "";
    const [prior1, prior2] = pickPriors(priorPool, posterId, i);

    let current = {
      userId: pet.postedById as mongoose.Types.ObjectId,
      name: pet.postedByName || "Caretaker",
      avatar: undefined as string | undefined,
    };

    if (pet.postedById) {
      const poster = await User.findById(pet.postedById).lean();
      if (poster) {
        current = {
          userId: poster._id as mongoose.Types.ObjectId,
          name: poster.name,
          avatar: poster.avatar ?? undefined,
        };
      }
    } else {
      // Fallback: use a prior as temporary caretaker if poster missing
      current = refOf(prior2);
      pet.postedById = prior2._id;
      pet.postedByName = prior2.name;
    }

    const photos = (pet.images ?? []).filter(Boolean);

    await replaceOwnershipChain(pet._id, [
      {
        user: refOf(prior1),
        from: "2023-05-01",
        to: "2024-09-01",
        note: "Chủ nuôi trước khi chuyển sang nơi tạm trú",
        checkIns: photos[0]
          ? [
              {
                photoUrl: photos[0],
                caption: CAPTIONS[i % CAPTIONS.length],
                date: "2024-08-20",
                uploadedBy: refOf(prior1),
              },
            ]
          : [],
      },
      {
        user: refOf(prior2),
        from: "2024-09-01",
        to: "2025-11-01",
        note: "Tạm nuôi / foster trước khi đăng nhận nuôi",
        checkIns: photos[1]
          ? [
              {
                photoUrl: photos[1],
                caption: CAPTIONS[(i + 1) % CAPTIONS.length],
                date: "2025-10-15",
                uploadedBy: refOf(prior2),
              },
            ]
          : photos[0]
            ? [
                {
                  photoUrl: photos[0],
                  caption: CAPTIONS[(i + 1) % CAPTIONS.length],
                  date: "2025-10-15",
                  uploadedBy: refOf(prior2),
                },
              ]
            : [],
      },
      {
        user: current,
        from: "2025-11-01",
        note: "Đang chăm / đăng tin nhận nuôi",
        checkIns: photos[0]
          ? [
              {
                photoUrl: photos[0],
                caption: CAPTIONS[(i + 2) % CAPTIONS.length],
                date: "2026-03-01",
                uploadedBy: current,
              },
            ]
          : [],
      },
    ]);

    pet.owners = [] as typeof pet.owners;
    await pet.save();
    updated += 1;
    console.log(
      `  ${pet.code} ${pet.name}: ${prior1.name} → ${prior2.name} → ${current.name} (${pet.status})`,
    );
  }

  console.log(`Done. Updated ${updated} pets.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
