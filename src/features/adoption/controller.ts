import type { Request, Response } from "express";
import mongoose from "mongoose";
import { AppError } from "../../shared/errors.js";
import { User } from "../auth/model.js";
import { Pet } from "../pets/model.js";
import { toPublicAdoptionRequest } from "./mapper.js";
import { AdoptionRequest } from "./model.js";
import type { CreateAdoptionRequestBody } from "./schemas.js";
import {
  canConfirmRequest,
  completeAdoptionTransfer,
  resolveCurrentOwner,
  revertPetIfNoPending,
} from "./service.js";
import { sendAdoptionRequestToOwner } from "../../shared/mail/sendAdoptionRequest.js";

function isObjectIdString(value: string) {
  return /^[a-f\d]{24}$/i.test(value);
}

async function findPet(idOrCode: string) {
  if (isObjectIdString(idOrCode)) {
    const byId = await Pet.findById(idOrCode);
    if (byId) return byId;
  }
  return Pet.findOne({ code: idOrCode });
}

/** Admin: all requests. User: own submitted requests. */
export async function listRequests(req: Request, res: Response) {
  const user = req.user!;
  const filter =
    user.role === "admin" ? {} : { adopterId: new mongoose.Types.ObjectId(user.userId) };

  const rows = await AdoptionRequest.find(filter).sort({ createdAt: -1 }).lean();
  res.json({ requests: rows.map((r) => toPublicAdoptionRequest(r)) });
}

/** Incoming pending requests for pets I currently care for. */
export async function listIncoming(req: Request, res: Response) {
  const userId = new mongoose.Types.ObjectId(req.user!.userId);
  const rows = await AdoptionRequest.find({
    ownerId: userId,
    status: "pending",
  })
    .sort({ createdAt: -1 })
    .lean();
  res.json({ requests: rows.map((r) => toPublicAdoptionRequest(r)) });
}

export async function createRequest(req: Request, res: Response) {
  const body = req.body as CreateAdoptionRequestBody;
  const auth = req.user!;

  const pet = await findPet(body.petId);
  if (!pet) throw new AppError(404, "Pet not found");
  if (pet.status !== "available") {
    throw new AppError(400, "Pet is not available for adoption requests");
  }

  const adopter = await User.findById(auth.userId).lean();
  if (!adopter) throw new AppError(404, "User not found");

  const owner = await resolveCurrentOwner(pet);
  if (owner && owner.userId.toString() === auth.userId) {
    throw new AppError(400, "You cannot request adoption of your own pet");
  }

  const existing = await AdoptionRequest.findOne({
    petId: pet._id,
    adopterId: adopter._id,
    status: "pending",
  });
  if (existing) throw new AppError(409, "You already have a pending request for this pet");

  const request = await AdoptionRequest.create({
    petId: pet._id,
    petName: pet.name,
    petCode: pet.code,
    petImage: pet.images?.[0],
    adopterId: adopter._id,
    adopterName: adopter.name,
    adopterAvatar: adopter.avatar,
    message: body.message ?? "",
    status: "pending",
    ...(owner
      ? {
          ownerId: owner.userId,
          ownerName: owner.name,
        }
      : {}),
  });

  pet.status = "pending";
  await pet.save();

  // Notify current owner by email (never fail the API response).
  void notifyOwnerOfAdoptionRequest({
    ownerId: owner?.userId,
    fallbackPostedById: pet.postedById,
    ownerName: owner?.name,
    adopterName: adopter.name,
    petName: pet.name,
    message: body.message,
  }).catch((err) => {
    console.error("[mail] adoption request notify failed:", err);
  });

  res.status(201).json({ request: toPublicAdoptionRequest(request) });
}

async function notifyOwnerOfAdoptionRequest(input: {
  ownerId?: mongoose.Types.ObjectId | null;
  fallbackPostedById?: mongoose.Types.ObjectId | null;
  ownerName?: string;
  adopterName: string;
  petName: string;
  message?: string;
}) {
  const candidateIds = [input.ownerId, input.fallbackPostedById].filter(
    (id): id is mongoose.Types.ObjectId => Boolean(id),
  );

  let ownerUser: { email?: string; name?: string } | null = null;
  for (const id of candidateIds) {
    ownerUser = await User.findById(id).select("email name").lean();
    if (ownerUser?.email) break;
  }

  if (!ownerUser?.email) {
    console.warn("[mail] skip notify — no owner email", {
      ownerId: input.ownerId?.toString(),
      postedById: input.fallbackPostedById?.toString(),
    });
    return;
  }

  console.log("[mail] sending adoption notify →", ownerUser.email, "pet:", input.petName);
  const sent = await sendAdoptionRequestToOwner({
    to: ownerUser.email,
    ownerName: ownerUser.name || input.ownerName || "bạn",
    adopterName: input.adopterName,
    petName: input.petName,
    message: input.message,
  });
  console.log("[mail] adoption notify result:", sent ? "sent" : "skipped (not configured)");
}

export async function confirmRequest(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const auth = req.user!;

  const request = await AdoptionRequest.findById(id);
  if (!request) throw new AppError(404, "Adoption request not found");
  if (request.status !== "pending") {
    throw new AppError(400, "Only pending requests can be confirmed");
  }

  const allowed = await canConfirmRequest(auth.userId, auth.role, request.ownerId);
  if (!allowed) throw new AppError(403, "Only the current owner or an admin can confirm");

  const pet = await Pet.findById(request.petId);
  if (!pet) throw new AppError(404, "Pet not found");

  // Re-check live ownership for non-admins (poster may have changed).
  if (auth.role !== "admin") {
    const liveOwner = await resolveCurrentOwner(pet);
    if (!liveOwner || liveOwner.userId.toString() !== auth.userId) {
      throw new AppError(403, "Only the current owner or an admin can confirm");
    }
  }

  await completeAdoptionTransfer(pet, request.adopterId as mongoose.Types.ObjectId);

  request.status = "approved";
  await request.save();

  await AdoptionRequest.updateMany(
    {
      petId: request.petId,
      status: "pending",
      _id: { $ne: request._id },
    },
    { $set: { status: "rejected" } },
  );

  res.json({ request: toPublicAdoptionRequest(request) });
}

export async function deleteRequest(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const auth = req.user!;

  const request = await AdoptionRequest.findById(id);
  if (!request) throw new AppError(404, "Adoption request not found");

  const isAdmin = auth.role === "admin";
  const isAdopter = request.adopterId.toString() === auth.userId;
  const isOwner = request.ownerId?.toString() === auth.userId;

  if (!isAdmin && !isAdopter && !isOwner) {
    throw new AppError(403, "Not allowed to delete this request");
  }

  const petId = request.petId as mongoose.Types.ObjectId;
  const wasPending = request.status === "pending";
  await request.deleteOne();

  if (wasPending) {
    await revertPetIfNoPending(petId);
  }

  res.json({ ok: true });
}
