/** Canonical pet breed keys stored in MongoDB. */
export const PET_BREEDS = [
  "cho_ta",
  "cho_lai",
  "poodle",
  "corgi",
  "golden",
  "husky",
  "bec_gie",
  "bull_phap",
  "phoc_chihuahua",
  "doberman",
  "fox_huou",
  "cho_bac_ha",
  "rottweiler",
  "meo_ta",
  "meo_lai",
  "other",
] as const;

export type PetBreed = (typeof PET_BREEDS)[number];

export const DOG_BREEDS: PetBreed[] = [
  "cho_ta",
  "cho_lai",
  "poodle",
  "corgi",
  "golden",
  "husky",
  "bec_gie",
  "bull_phap",
  "phoc_chihuahua",
  "doberman",
  "fox_huou",
  "cho_bac_ha",
  "rottweiler",
  "other",
];

export const CAT_BREEDS: PetBreed[] = ["meo_ta", "meo_lai", "other"];

export function breedsForSpecies(species: "dog" | "cat"): PetBreed[] {
  return species === "cat" ? CAT_BREEDS : DOG_BREEDS;
}

/** Map legacy free-text breeds (and junk filter values) → enum. */
const LEGACY_BREED_MAP: Record<string, PetBreed> = {
  "chó ta": "cho_ta",
  "cho ta": "cho_ta",
  "chó lai": "cho_lai",
  "cho lai": "cho_lai",
  poodle: "poodle",
  corgi: "corgi",
  golden: "golden",
  husky: "husky",
  "béc giê": "bec_gie",
  "bẹc giê": "bec_gie",
  "bec gie": "bec_gie",
  "bull pháp": "bull_phap",
  "bull phap": "bull_phap",
  "phốc/chihuahua": "phoc_chihuahua",
  "phoc/chihuahua": "phoc_chihuahua",
  chihuahua: "phoc_chihuahua",
  doberman: "doberman",
  "fox hươu": "fox_huou",
  "fox huou": "fox_huou",
  "chó bắc hà": "cho_bac_ha",
  "cho bac ha": "cho_bac_ha",
  rottweiler: "rottweiler",
  "mèo ta": "meo_ta",
  "meo ta": "meo_ta",
  "mèo lai": "meo_lai",
  "meo lai": "meo_lai",
  other: "other",
  khác: "other",
};

export function normalizeBreed(raw: string | null | undefined): PetBreed {
  if (!raw) return "other";
  const trimmed = raw.trim();
  if ((PET_BREEDS as readonly string[]).includes(trimmed)) {
    return trimmed as PetBreed;
  }
  const key = trimmed.toLowerCase();
  return LEGACY_BREED_MAP[key] ?? "other";
}
