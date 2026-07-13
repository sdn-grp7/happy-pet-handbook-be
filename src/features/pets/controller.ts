import type { Request, Response } from "express";
import mongoose from "mongoose";
import { AppError } from "../../shared/errors.js";
import { User } from "../auth/model.js";
import { isObjectIdString, toPublicPet, type PetLean } from "./mapper.js";
import { Pet } from "./model.js";
import type {
  AddCheckInBody,
  AddVaccinationBody,
  CreatePetBody,
  UpdatePetBody,
} from "./schemas.js";

async function findPetByIdOrCode(idOrCode: string) {
  if (isObjectIdString(idOrCode)) {
    const byId = await Pet.findById(idOrCode);
    if (byId) return byId;
  }
  return Pet.findOne({ code: idOrCode });
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

/** Keep ownership history in sync when an adopter is assigned. */
function ensureAdopterOwnerPeriod(
  pet: InstanceType<typeof Pet>,
  adopter: { userId: mongoose.Types.ObjectId; name: string; avatar?: string | null },
) {
  const alreadyOpen = pet.owners.some(
    (o) => o.user.userId.toString() === adopter.userId.toString() && !o.to,
  );
  if (alreadyOpen) return;

  for (const o of pet.owners) {
    if (!o.to) o.to = new Date().toISOString().slice(0, 10);
  }

  pet.owners.push({
    user: {
      userId: adopter.userId,
      name: adopter.name,
      avatar: adopter.avatar ?? undefined,
    },
    from: new Date().toISOString().slice(0, 10),
    checkIns: [],
  });
}

export async function listPets(req: Request, res: Response) {
  const { status, species } = req.query as { status?: string; species?: string };
  const filter: Record<string, string> = {};
  if (status) filter.status = status;
  if (species) filter.species = species;

  const pets = await Pet.find(filter).sort({ createdAt: -1 }).lean();
  res.json({ pets: pets.map((p) => toPublicPet(p as PetLean)) });
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
  res.json({ pets: pets.map((p) => toPublicPet(p as PetLean)) });
}

export async function getPet(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const pet = await findPetByIdOrCode(id);
  if (!pet) throw new AppError(404, "Pet not found");
  res.json({ pet: toPublicPet(pet.toObject() as PetLean) });
}

export async function createPet(req: Request, res: Response) {
  const body = req.body as CreatePetBody;
  const existing = await Pet.findOne({ code: body.code });
  if (existing) throw new AppError(409, "Pet code already exists");

  const poster = await resolvePoster(req.user!.userId);

  const { adoptedByUserId, ...petFields } = body;
  const adoptedBy =
    body.status === "adopted" && adoptedByUserId
      ? await resolveAdopterRef(adoptedByUserId)
      : undefined;

  const pet = await Pet.create({
    ...petFields,
    ...(adoptedBy ? { adoptedBy } : {}),
    postedById: poster._id,
    postedByName: poster.name,
    vaccinations: [],
    owners: adoptedBy
      ? [
          {
            user: {
              userId: adoptedBy.userId,
              name: adoptedBy.name,
              avatar: adoptedBy.avatar ?? undefined,
            },
            from: new Date().toISOString().slice(0, 10),
            checkIns: [],
          },
        ]
      : [],
  });

  res.status(201).json({ pet: toPublicPet(pet.toObject() as PetLean) });
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
  if (body.age != null) pet.age = body.age;
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
      ensureAdopterOwnerPeriod(pet, adopter);
    }
  }

  if (pet.status !== "adopted") {
    pet.set("adoptedBy", undefined);
  } else if (!pet.adoptedBy) {
    throw new AppError(400, "adoptedByUserId is required when status is adopted");
  }

  await pet.save();
  res.json({ pet: toPublicPet(pet.toObject() as PetLean) });
}

export async function deletePet(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const pet = await findPetByIdOrCode(id);
  if (!pet) throw new AppError(404, "Pet not found");
  await pet.deleteOne();
  res.json({ ok: true });
}

export async function addVaccination(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const body = req.body as AddVaccinationBody;
  const pet = await findPetByIdOrCode(id);
  if (!pet) throw new AppError(404, "Pet not found");

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
  res.status(201).json({ pet: toPublicPet(pet.toObject() as PetLean) });
}

/** Authenticated user posts a check-in photo under their ownership period (creates one if needed). */
export async function addCheckIn(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const body = req.body as AddCheckInBody;
  const pet = await findPetByIdOrCode(id);
  if (!pet) throw new AppError(404, "Pet not found");

  const user = await User.findById(req.user!.userId).lean();
  if (!user) throw new AppError(404, "User not found");

  const userRef = {
    userId: user._id as mongoose.Types.ObjectId,
    name: user.name,
    avatar: user.avatar,
  };

  let owner = pet.owners.find(
    (o) => o.user.userId.toString() === user._id.toString() && !o.to,
  );

  if (!owner) {
    pet.owners.push({
      user: userRef,
      from: body.date || new Date().toISOString().slice(0, 10),
      checkIns: [],
    });
    owner = pet.owners[pet.owners.length - 1];
  }

  owner.checkIns.push({
    photoUrl: body.photoUrl,
    caption: body.caption,
    date: body.date,
    uploadedBy: userRef,
  });

  await pet.save();
  res.status(201).json({ pet: toPublicPet(pet.toObject() as PetLean) });
}
