import type { Request, Response } from "express";
import mongoose from "mongoose";
import { AppError } from "../../shared/errors.js";
import { User } from "../auth/model.js";
import { resolveCurrentOwner } from "../adoption/service.js";
import {
  assignCurrentOwner,
  deleteOwnershipForPet,
  findOrCreateOpenPeriod,
  listOwnershipByPetIds,
  listOwnershipForPetLean,
} from "../ownership/service.js";
import { isObjectIdString, toPublicPet, type OwnerDoc, type PetLean } from "./mapper.js";
import { Pet } from "./model.js";
import type {
  AddCheckInBody,
  AddVaccinationBody,
  CreatePetBody,
  UpdatePetBody,
} from "./schemas.js";
import { formatAgeLabel } from "./age.js";

async function findPetByIdOrCode(idOrCode: string) {
  if (isObjectIdString(idOrCode)) {
    const byId = await Pet.findById(idOrCode);
    if (byId) return byId;
  }
  return Pet.findOne({ code: idOrCode });
}

async function assertCanCareForPet(
  pet: InstanceType<typeof Pet>,
  userId: string,
  role: string,
) {
  if (role === "admin") return;
  const owner = await resolveCurrentOwner(pet);
  if (!owner || owner.userId.toString() !== userId) {
    throw new AppError(403, "Only the current owner can update care records for this pet");
  }
}

async function resolvePoster(userId: string) {
  const user = await User.findById(userId).lean();
  if (!user) throw new AppError(404, "Poster user not found");
  return user;
}

async function resolveAdopterRef(userId: string) {
  const user = await User.findById(userId).lean();
  if (!user) throw new AppError(404, "Adopter user not found");
  return {
    userId: user._id as mongoose.Types.ObjectId,
    name: user.name,
    avatar: user.avatar,
  };
}

async function toPetResponse(pet: InstanceType<typeof Pet> | PetLean) {
  const lean = ("toObject" in pet ? pet.toObject() : pet) as PetLean;
  const owners = await listOwnershipForPetLean(lean._id as mongoose.Types.ObjectId);
  return toPublicPet(lean, owners as OwnerDoc[]);
}

async function toPetListResponse(pets: PetLean[]) {
  const ids = pets.map((p) => p._id as mongoose.Types.ObjectId);
  const byPet = await listOwnershipByPetIds(ids);
  return pets.map((p) =>
    toPublicPet(p, (byPet.get(p._id.toString()) ?? []) as OwnerDoc[]),
  );
}

export async function listPets(req: Request, res: Response) {
  const { status, species, adoptedBy } = req.query as {
    status?: string;
    species?: string;
    adoptedBy?: string;
  };
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (species) filter.species = species;
  if (adoptedBy) filter["adoptedBy.userId"] = new mongoose.Types.ObjectId(adoptedBy);

  const pets = await Pet.find(filter).sort({ createdAt: -1 }).lean();
  res.json({ pets: await toPetListResponse(pets as PetLean[]) });
}

export async function listPickups(_req: Request, res: Response) {
  const pets = await Pet.find({
    status: { $in: ["available", "pending"] },
    "pickup.address": { $exists: true, $ne: "" },
    "pickup.lat": { $ne: null },
    "pickup.lng": { $ne: null },
  })
    .sort({ createdAt: -1 })
    .lean();
  res.json({ pets: await toPetListResponse(pets as PetLean[]) });
}

export async function getPet(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const pet = await findPetByIdOrCode(id);
  if (!pet) throw new AppError(404, "Pet not found");
  res.json({ pet: await toPetResponse(pet) });
}

export async function createPet(req: Request, res: Response) {
  const body = req.body as CreatePetBody;
  const poster = await resolvePoster(req.user!.userId);
  const isAdmin = req.user!.role === "admin";

  // Regular users can only list pets as available for adoption.
  const status = isAdmin ? (body.status ?? "available") : "available";
  const adoptedByUserId = isAdmin ? body.adoptedByUserId : undefined;

  const code =
    body.code?.trim() ||
    `U${poster._id.toString().slice(-4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

  const existing = await Pet.findOne({ code });
  if (existing) throw new AppError(409, "Pet code already exists");

  const adoptedBy =
    status === "adopted" && adoptedByUserId
      ? await resolveAdopterRef(adoptedByUserId)
      : undefined;

  const { adoptedByUserId: _omit, code: _code, status: _status, ...petFields } = body;

  const pet = await Pet.create({
    ...petFields,
    code,
    status,
    ageMonths: body.ageMonths,
    age: formatAgeLabel(body.ageMonths),
    ...(adoptedBy ? { adoptedBy } : {}),
    postedById: poster._id,
    postedByName: poster.name,
    vaccinations: [],
    owners: [],
  });

  const caretaker = adoptedBy ?? {
    userId: poster._id as mongoose.Types.ObjectId,
    name: poster.name,
    avatar: poster.avatar,
  };
  await assignCurrentOwner(pet._id, caretaker);

  res.status(201).json({ pet: await toPetResponse(pet) });
}

export async function updatePet(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const body = req.body as UpdatePetBody;
  const pet = await findPetByIdOrCode(id);
  if (!pet) throw new AppError(404, "Pet not found");

  if (body.code && body.code !== pet.code) {
    const clash = await Pet.findOne({ code: body.code });
    if (clash) throw new AppError(409, "Pet code already exists");
    pet.code = body.code;
  }
  if (body.name != null) pet.name = body.name;
  if (body.species != null) pet.species = body.species;
  if (body.breed != null) pet.breed = body.breed;
  if (body.gender != null) pet.gender = body.gender;
  if (body.ageMonths != null) {
    pet.ageMonths = body.ageMonths;
    pet.age = formatAgeLabel(body.ageMonths);
  }
  if (body.weightKg !== undefined) pet.weightKg = body.weightKg;
  if (body.healthStatus != null) pet.healthStatus = body.healthStatus;
  if (body.intakeYear !== undefined) pet.intakeYear = body.intakeYear;
  if (body.description !== undefined) pet.description = body.description;
  if (body.notes !== undefined) pet.notes = body.notes;
  if (body.images != null) pet.images = body.images;
  if (body.status != null) pet.status = body.status;
  if (body.zaloPhone !== undefined) pet.zaloPhone = body.zaloPhone;
  if (body.pickup !== undefined) pet.pickup = body.pickup;

  if (body.adoptedByUserId !== undefined) {
    if (body.adoptedByUserId === null) {
      pet.set("adoptedBy", undefined);
    } else {
      const adopter = await resolveAdopterRef(body.adoptedByUserId);
      pet.adoptedBy = adopter;
      if (body.status == null) pet.status = "adopted";
      await assignCurrentOwner(pet._id, adopter);
    }
  }

  if (pet.status !== "adopted") {
    pet.set("adoptedBy", undefined);
  } else if (!pet.adoptedBy) {
    throw new AppError(400, "adoptedByUserId is required when status is adopted");
  }

  await pet.save();
  res.json({ pet: await toPetResponse(pet) });
}

export async function deletePet(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const pet = await findPetByIdOrCode(id);
  if (!pet) throw new AppError(404, "Pet not found");
  await deleteOwnershipForPet(pet._id);
  await pet.deleteOne();
  res.json({ ok: true });
}

export async function addVaccination(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const body = req.body as AddVaccinationBody;
  const pet = await findPetByIdOrCode(id);
  if (!pet) throw new AppError(404, "Pet not found");

  await assertCanCareForPet(pet, req.user!.userId, req.user!.role);

  const uploader = await User.findById(req.user!.userId).lean();
  if (!uploader) throw new AppError(404, "User not found");

  pet.vaccinations.push({
    name: body.name,
    date: body.date,
    nextDue: body.nextDue,
    notes: body.notes,
    photoUrl: body.photoUrl,
    uploadedBy: {
      userId: uploader._id,
      name: uploader.name,
      avatar: uploader.avatar,
    },
    uploadedAt: new Date(),
  });

  await pet.save();
  res.status(201).json({ pet: await toPetResponse(pet) });
}

/** Current owner (or admin) posts a check-in photo under their ownership period. */
export async function addCheckIn(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const body = req.body as AddCheckInBody;
  const pet = await findPetByIdOrCode(id);
  if (!pet) throw new AppError(404, "Pet not found");

  await assertCanCareForPet(pet, req.user!.userId, req.user!.role);

  const user = await User.findById(req.user!.userId).lean();
  if (!user) throw new AppError(404, "User not found");

  const userRef = {
    userId: user._id as mongoose.Types.ObjectId,
    name: user.name,
    avatar: user.avatar,
  };

  const period = await findOrCreateOpenPeriod(
    pet._id,
    userRef,
    body.date || new Date().toISOString().slice(0, 10),
  );

  period.checkIns.push({
    photoUrl: body.photoUrl,
    caption: body.caption,
    date: body.date,
    uploadedBy: userRef,
  });
  await period.save();

  res.status(201).json({ pet: await toPetResponse(pet) });
}
