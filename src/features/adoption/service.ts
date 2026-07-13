import mongoose from "mongoose";
import { AppError } from "../../shared/errors.js";
import { User } from "../auth/model.js";
import { OwnershipHistory } from "../ownership/model.js";
import { assignCurrentOwner } from "../ownership/service.js";
import { Pet } from "../pets/model.js";
import { AdoptionRequest } from "./model.js";

export type CurrentOwner = {
  userId: mongoose.Types.ObjectId;
  name: string;
  avatar?: string | null;
};

/** Open ownership period, else listing poster (caretaker). */
export async function resolveCurrentOwner(
  pet: InstanceType<typeof Pet>,
): Promise<CurrentOwner | null> {
  const open = await OwnershipHistory.findOne({
    petId: pet._id,
    $or: [{ to: { $exists: false } }, { to: null }, { to: "" }],
  }).lean();

  if (open?.user?.userId) {
    return {
      userId: open.user.userId as mongoose.Types.ObjectId,
      name: open.user.name,
      avatar: open.user.avatar,
    };
  }

  if (pet.postedById) {
    const poster = await User.findById(pet.postedById).lean();
    if (poster) {
      return {
        userId: poster._id as mongoose.Types.ObjectId,
        name: poster.name,
        avatar: poster.avatar,
      };
    }
    return {
      userId: pet.postedById as mongoose.Types.ObjectId,
      name: pet.postedByName || "Owner",
    };
  }

  return null;
}

export async function canConfirmRequest(
  userId: string,
  role: string,
  ownerId?: mongoose.Types.ObjectId | null,
) {
  if (role === "admin") return true;
  if (!ownerId) return false;
  return ownerId.toString() === userId;
}

export async function revertPetIfNoPending(petId: mongoose.Types.ObjectId) {
  const remaining = await AdoptionRequest.countDocuments({ petId, status: "pending" });
  if (remaining > 0) return;

  const pet = await Pet.findById(petId);
  if (!pet || pet.status !== "pending") return;
  pet.status = "available";
  pet.set("adoptedBy", undefined);
  await pet.save();
}

export async function completeAdoptionTransfer(
  pet: InstanceType<typeof Pet>,
  adopterId: mongoose.Types.ObjectId,
) {
  const adopter = await User.findById(adopterId).lean();
  if (!adopter) throw new AppError(404, "Adopter user not found");

  const adopterRef = {
    userId: adopter._id as mongoose.Types.ObjectId,
    name: adopter.name,
    avatar: adopter.avatar,
  };

  pet.status = "adopted";
  pet.adoptedBy = adopterRef;
  await pet.save();
  await assignCurrentOwner(pet._id, adopterRef);
}
