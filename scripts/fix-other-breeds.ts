/**
 * Assign species-based default breeds for pets stuck on `other`
 * (legacy junk values like gender/age that were migrated to other).
 *
 * Usage: npx tsx scripts/fix-other-breeds.ts
 */
import "dotenv/config";
import mongoose from "mongoose";
import { env } from "../src/config/env.js";
import { Pet } from "../src/features/pets/model.js";

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  console.log("MongoDB connected");

  const pets = await Pet.find({ breed: "other" });
  console.log(`Pets with breed=other: ${pets.length}`);

  let updated = 0;
  for (const pet of pets) {
    const next = pet.species === "cat" ? "meo_lai" : "cho_lai";
    pet.breed = next;
    await pet.save();
    updated += 1;
    console.log(`  ${pet.code} ${pet.name} (${pet.species}) → ${next}`);
  }

  console.log(`Done. Updated ${updated}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
