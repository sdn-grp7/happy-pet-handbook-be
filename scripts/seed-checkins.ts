/**
 * Seed check-in photos onto OwnershipHistory periods (prior + current owners).
 * Uses each pet's own images as photo URLs.
 *
 * Usage: npx tsx scripts/seed-checkins.ts
 */
import "dotenv/config";
import mongoose from "mongoose";
import { env } from "../src/config/env.js";
import { OwnershipHistory } from "../src/features/ownership/model.js";
import { Pet } from "../src/features/pets/model.js";

const CAPTIONS = [
  "Bé ăn khỏe, chơi năng động tuần này.",
  "Check-in sau khi về nhà mới — bé đã quen chỗ ngủ.",
  "Cập nhật sức khỏe: lông bóng, cân nặng ổn.",
  "Đi dạo buổi sáng, bé rất vui vẻ.",
  "Ảnh theo dõi sau bàn giao — mọi thứ ổn.",
];

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  console.log("MongoDB connected");

  const pets = await Pet.find({ status: "adopted", adoptedBy: { $exists: true } }).lean();
  let updated = 0;

  for (let i = 0; i < pets.length; i++) {
    const pet = pets[i];
    const photos = (pet.images ?? []).filter(Boolean);
    if (photos.length === 0) continue;

    const periods = await OwnershipHistory.find({ petId: pet._id }).sort({ from: 1 });
    if (periods.length === 0) continue;

    for (let p = 0; p < periods.length; p++) {
      const period = periods[p];
      const photoUrl = photos[p % photos.length];
      const caption = CAPTIONS[(i + p) % CAPTIONS.length];
      const date = period.to || period.from || "2025-06-15";

      period.checkIns = [
        {
          photoUrl,
          caption,
          date,
          uploadedBy: {
            userId: period.user.userId,
            name: period.user.name,
            avatar: period.user.avatar,
          },
        },
      ];
      // Current owner gets a second check-in when multiple photos exist
      if (!period.to && photos.length > 1) {
        period.checkIns.push({
          photoUrl: photos[1 % photos.length],
          caption: CAPTIONS[(i + p + 2) % CAPTIONS.length],
          date: "2025-09-01",
          uploadedBy: {
            userId: period.user.userId,
            name: period.user.name,
            avatar: period.user.avatar,
          },
        });
      }
      await period.save();
    }
    updated += 1;
    console.log(`  ${pet.code} ${pet.name}: ${periods.length} period(s) with check-ins`);
  }

  console.log(`Done. Updated ${updated} pets.`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
