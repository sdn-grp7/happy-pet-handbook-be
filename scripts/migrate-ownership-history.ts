/**
 * Migrate embedded pet.owners[] → OwnershipHistory collection, then clear pet.owners.
 * Usage: npx tsx scripts/migrate-ownership-history.ts
 */
import "dotenv/config";
import mongoose from "mongoose";
import { env } from "../src/config/env.js";
import { OwnershipHistory } from "../src/features/ownership/model.js";
import { Pet } from "../src/features/pets/model.js";

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  console.log("MongoDB connected");

  const pets = await Pet.find({ "owners.0": { $exists: true } });
  console.log(`Pets with embedded owners: ${pets.length}`);

  let migrated = 0;
  for (const pet of pets) {
    const existing = await OwnershipHistory.countDocuments({ petId: pet._id });
    if (existing === 0 && pet.owners?.length) {
      await OwnershipHistory.insertMany(
        pet.owners.map((o) => ({
          petId: pet._id,
          user: {
            userId: o.user.userId,
            name: o.user.name,
            avatar: o.user.avatar,
          },
          from: o.from,
          ...(o.to ? { to: o.to } : {}),
          ...(o.note ? { note: o.note } : {}),
          checkIns: o.checkIns ?? [],
        })),
      );
      migrated += 1;
    }
    pet.owners = [] as typeof pet.owners;
    await pet.save();
  }

  console.log(`Migrated ownership for ${migrated} pets; cleared embedded owners.`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
