/** Format ageMonths into a Vietnamese display label. */
export function formatAgeLabel(ageMonths: number): string {
  if (!Number.isFinite(ageMonths) || ageMonths < 0) return "Đang cập nhật";
  const months = Math.round(ageMonths);
  if (months < 12) {
    if (months <= 0) return "Dưới 1 tháng";
    return `${months} tháng`;
  }
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (rem === 0) return `${years} tuổi`;
  return `${years} tuổi ${rem} tháng`;
}

/** Parse legacy free-text age labels → months (best effort). */
export function parseAgeToMonths(age: string | null | undefined): number | null {
  if (!age) return null;
  const raw = age.trim().toLowerCase();
  if (!raw || raw.includes("cập nhật") || raw.includes("updating")) return null;

  if (/già|lớn tuổi|trưởng thành/.test(raw)) return 8 * 12;

  // Prefer explicit months (e.g. "dưới 6 tháng", "8 tháng", "Dưới 6 tháng tuổi")
  if (raw.includes("tháng") || raw.includes("thang") || raw.includes("month")) {
    const m = raw.match(/(\d+(?:[.,]\d+)?)/);
    const months = m ? Number(m[1].replace(",", ".")) : NaN;
    if (!Number.isFinite(months)) return null;
    if (/dưới|duoi|<\s*|under|less/i.test(raw)) {
      return Math.max(0, Math.round(months / 2));
    }
    return Math.round(months);
  }

  if (/dưới\s*1\s*tuổi|duoi\s*1\s*tuoi|under\s*1/i.test(raw)) return 6;

  const range = raw.match(/(\d+)\s*[-–~]\s*(\d+)/);
  if (range) {
    const a = Number(range[1]);
    const b = Number(range[2]);
    return Math.round(((a + b) / 2) * 12);
  }

  if (/dưới|duoi|<\s*|under|less/i.test(raw) && /tuổi|tuoi|year/.test(raw)) {
    const m = raw.match(/(\d+(?:[.,]\d+)?)/);
    const y = m ? Number(m[1].replace(",", ".")) : NaN;
    if (!Number.isFinite(y)) return null;
    return Math.max(0, Math.round((y / 2) * 12));
  }

  // Bare number or "Khoảng N tuổi" → treat as years
  const single = raw.match(/(\d+(?:[.,]\d+)?)/);
  if (!single) return null;
  const y = Number(single[1].replace(",", "."));
  if (!Number.isFinite(y)) return null;
  // Without a unit, a bare integer ≥ 18 is ambiguous; still treat as years for pets (cap later).
  return Math.round(y * 12);
}
