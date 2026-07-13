/**
 * Backfill pet.ageMonths from legacy free-text pet.age.
 * Does NOT overwrite age text. Uses raw BSON (ignores schema defaults).
 * Usage: npx tsx scripts/migrate-age-months.ts
 */
import "dotenv/config";
import mongoose from "mongoose";
import { env } from "../src/config/env.js";
import { parseAgeToMonths } from "../src/features/pets/age.js";

type PetAgeDoc = {
  _id: mongoose.Types.ObjectId;
  code: string;
  age?: string;
  ageMonths?: number;
};

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  console.log("MongoDB connected");

  const col = mongoose.connection.collection<PetAgeDoc>("pets");
  const pets = await col.find({}).project({ code: 1, age: 1, ageMonths: 1 }).toArray();
  let updated = 0;

  for (const pet of pets) {
    const hasStoredMonths =
      typeof pet.ageMonths === "number" && Number.isFinite(pet.ageMonths);
    const fromText = parseAgeToMonths(pet.age);
    const nextMonths = hasStoredMonths
      ? Math.round(pet.ageMonths as number)
      : (fromText ?? 12);

    // Only write when missing or when stored value is the bogus schema default
    // while text clearly parses to something else.
    const shouldFix =
      !hasStoredMonths ||
      (pet.ageMonths === 12 && fromText != null && fromText !== 12);

    if (!shouldFix && hasStoredMonths) continue;

    console.log(
      `  ${pet.code} age="${pet.age ?? ""}" → ${nextMonths}m` +
        (hasStoredMonths ? ` (was ${pet.ageMonths})` : " (from text)"),
    );
    await col.updateOne({ _id: pet._id }, { $set: { ageMonths: nextMonths } });
    updated += 1;
  }

  console.log(`Done. Updated ${updated}/${pets.length}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
