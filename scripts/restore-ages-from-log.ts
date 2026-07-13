/**
 * Restore pet.age labels wiped by a bad ageMonths default, then recompute ageMonths.
 * Source: console log from the first migrate:age-months run (original age=… values).
 * Usage: npx tsx scripts/restore-ages-from-log.ts
 */
import "dotenv/config";
import mongoose from "mongoose";
import { env } from "../src/config/env.js";
import { formatAgeLabel, parseAgeToMonths } from "../src/features/pets/age.js";
import { Pet } from "../src/features/pets/model.js";

/** code → original free-text age (from migration log before overwrite). */
const ORIGINAL_AGES: Record<string, string> = {
  "900255001491931": "3 tuổi",
  "900255001490515": "3 tuổi",
  "900255001491388": "Dưới 1 tuổi",
  "900255001491401": "Dưới 1 tuổi",
  "900255001486402": "Dưới 1 tuổi",
  "900255001490161": "4 tuổi",
  "900255001492371": "Khoảng 2 tuổi",
  "900255001491890": "Khoảng 3 tuổi",
  "900263000671261": "Khoảng 2 tuổi",
  "83411480": "Đang cập nhật",
  "900255001491748": "Khoảng 3 tuổi",
  "900255001491101": "Khoảng 3 tuổi",
  "900255001491453": "Dưới 1 tuổi",
  "900255001491312": "Khoảng 3 tuổi",
  "900255001491318": "2 tuổi",
  "900255001486762": "2 tuổi",
  "900255001486764": "2 tuổi",
  "900255001491374": "3-4 tuổi",
  "900255001491373": "4 tuổi",
  "900263000671187": "2 tuổi",
  "900263003834541": "1-2 tuổi",
  "900263000671331": "3-4 tuổi",
  "900263000671687": "4 tuổi",
  "900263002641621": "3-4 tuổi",
  "900255001492372": "2 tuổi",
  "900263002641357": "4 tuổi",
  "900255001490284": "3-4 tuổi",
  "900263002641493": "3-4 tuổi",
  "900263002641202": "3-4 tuổi",
  "900263002641990": "4 tuổi",
  "900263002641335": "2 tuổi",
  "900263002641364": "3-4 tuổi",
  "900263002641463": "3-4 tuổi",
  "900263002641469": "3-4 tuổi",
  "900255001490069": "3-4 tuổi",
  "900255001490084": "3-4 tuổi",
  "900263002641332": "3-4 tuổi",
  "900263002641515": "3-4 tuổi",
  "900255001490081": "4-5 tuổi",
  "900255001490070": "3-4 tuổi",
  "900255001490074": "2 tuổi",
  "900255001490071": "3-4 tuổi",
  "900263002641923": "3-4 tuổi",
  "83g": "Dưới 1 tuổi",
  "83g-83g": "4-5 tuổi",
  "81g": "dưới 6 tháng",
  "62g": "Dưới 4 tuổi",
  "45313930": "1-2 tuổi",
  "45313878": "dưới 6 tháng",
  "900263002641997": "1-2 tuổi",
  "900263002641359": "8 tháng",
  "45303480": "8 tháng",
  "45303354": "8 tháng",
  "900263002641738": "Đang cập nhật",
  "990001000150807": "4-5 tuổi",
  "900263002641495": "Khoảng 3 tuổi",
  "900023069819660": "Đang cập nhật",
  "900263000671159": "2 tuổi",
  "900263000670991": "2 tuổi",
  "45288141": "1-2 tuổi",
  "900263000671050": "khoảng 6 tuổi",
  "900263002641330": "Đang cập nhật",
  "900263002641945": "Đang cập nhật",
  "900263002641896": "1-2 tuổi",
  "990001000150912": "1-2 tuổi",
  "900263000671187-900263000671187": "Đang cập nhật",
  "900263002641624": "1-2 tuổi",
  "44930335": "Đang cập nhật",
  "44929965": "Dưới 1 tuổi",
  "900263000671146": "4-5 tuổi",
  "1314": "Trưởng thành",
  "1208": "Lớn tuổi",
  "1228": "Già",
  "1227": "Trưởng thành",
  "1166": "Dưới 1 tuổi",
  "39757208": "2 tuổi",
  "422": "4 tuổi",
  "83428559": "11 tuổi",
  "900255001491633": "Khoảng 4 tuổi",
  "83422040": "Khoảng 10 tuổi",
  "1177": "Dưới 1 tuổi",
  "900255001491165": "Dưới 1 tuổi",
  "900255001491375": "4-5 tuổi",
  "82g": "dưới 6 tháng",
  "900263000671101": "Dưới 1 tuổi",
  "45314131": "1-2 tuổi",
  "45313936": "Đang cập nhật",
  "9900010001509097": "4 tuổi",
  "44935373": "Đang cập nhật",
  "44935260": "4 tuổi",
  "990001000150916": "Khoảng 3 tuổi",
  "900263002641654": "2 tuổi",
  "900263000670868/1279": "Dưới 1 tuổi",
  "900263000671345-1301": "Trưởng thành",
  "1214": "Dưới 6 tháng tuổi",
  "1195": "Khoảng 3 tuổi",
  "1285": "Trưởng thành",
  "615": "dưới 6 tháng",
  "614": "Trưởng thành",
  "41598995": "Trưởng thành",
  "1169": "Dưới 1 tuổi",
  "778": "Dưới 1 tuổi",
  "776": "Dưới 4 tuổi",
  "1197": "Dưới 6 tháng tuổi",
  "1136": "Dưới 4 tuổi",
  Đ03: "dưới 6 tháng",
  Đ02: "2 tuổi",
  Đ1: "2 tuổi",
  "45314128": "Đang cập nhật",
  "45313999": "Đang cập nhật",
  "45313939": "2 tuổi",
  "45313919": "Dưới 4 tuổi",
  "1316": "Trưởng thành",
  "1315": "dưới 6 tháng",
  "1160": "Trưởng thành",
  "1124": "Trưởng thành",
  "1123": "Trưởng thành",
  "1157": "Dưới 1 tuổi",
  "1128": "Dưới 1 tuổi",
  "1122": "Dưới 1 tuổi",
  "1121": "Dưới 1 tuổi",
  "1125": "Dưới 1 tuổi",
  "41521651": "Dưới 1 tuổi",
  "1000": "Dưới 1 tuổi",
};

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  console.log("MongoDB connected");

  let updated = 0;
  for (const [code, originalAge] of Object.entries(ORIGINAL_AGES)) {
    const months = parseAgeToMonths(originalAge) ?? 12;
    const label = formatAgeLabel(months);
    const res = await Pet.collection.updateOne(
      { code },
      { $set: { age: originalAge, ageMonths: months } },
    );
    if (res.matchedCount) {
      console.log(`  ${code}: "${originalAge}" → ${months}m (display will be "${label}")`);
      updated += 1;
    } else {
      console.warn(`  missing code ${code}`);
    }
  }

  // Keep free-text age for display of ambiguous labels; still store months for filter.
  // Re-sync age label only when we want canonical format — leave original text for now
  // so admins can still see "Khoảng 3 tuổi". Filter uses ageMonths.
  console.log(`Restored ${updated}/${Object.keys(ORIGINAL_AGES).length}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
