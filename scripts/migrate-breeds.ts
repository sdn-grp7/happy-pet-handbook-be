/**
 * Normalize free-text pet.breed values into the PetBreed enum.
 * Usage: npx tsx scripts/migrate-breeds.ts
 */
import "dotenv/config";
import mongoose from "mongoose";
import { env } from "../src/config/env.js";
import { normalizeBreed } from "../src/features/pets/breeds.js";
import { Pet } from "../src/features/pets/model.js";

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  console.log("MongoDB connected");

  const pets = await Pet.find({});
  let updated = 0;
  const counts = new Map<string, number>();

  for (const pet of pets) {
    const next = normalizeBreed(pet.breed);
    counts.set(next, (counts.get(next) ?? 0) + 1);
    if (pet.breed !== next) {
      console.log(`  ${pet.code} "${pet.breed}" → ${next}`);
      pet.breed = next;
      await pet.save();
      updated += 1;
    }
  }

  console.log(`Done. Updated ${updated}/${pets.length}`);
  console.log("Distribution:", Object.fromEntries([...counts.entries()].sort()));
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
