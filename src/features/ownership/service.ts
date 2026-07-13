import mongoose from "mongoose";
import { OwnershipHistory } from "./model.js";

export type UserRefInput = {
  userId: mongoose.Types.ObjectId;
  name: string;
  avatar?: string | null;
};

export async function listOwnershipByPetIds(petIds: mongoose.Types.ObjectId[]) {
  const rows = petIds.length
    ? await OwnershipHistory.find({ petId: { $in: petIds } })
        .sort({ from: 1, createdAt: 1 })
        .lean()
    : [];
  const map = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = row.petId.toString();
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }
  return map;
}

export async function listOwnershipForPet(petId: mongoose.Types.ObjectId) {
  return OwnershipHistory.find({ petId }).sort({ from: 1, createdAt: 1 });
}

export async function listOwnershipForPetLean(petId: mongoose.Types.ObjectId) {
  return OwnershipHistory.find({ petId }).sort({ from: 1, createdAt: 1 }).lean();
}

/** Close all open periods, then open a new one for the adopter. */
export async function assignCurrentOwner(
  petId: mongoose.Types.ObjectId,
  adopter: UserRefInput,
  from = new Date().toISOString().slice(0, 10),
) {
  const open = await OwnershipHistory.findOne({
    petId,
    "user.userId": adopter.userId,
    $or: [{ to: { $exists: false } }, { to: null }, { to: "" }],
  });
  if (open) return open;

  await OwnershipHistory.updateMany(
    {
      petId,
      $or: [{ to: { $exists: false } }, { to: null }, { to: "" }],
    },
    { $set: { to: from } },
  );

  return OwnershipHistory.create({
    petId,
    user: {
      userId: adopter.userId,
      name: adopter.name,
      avatar: adopter.avatar ?? undefined,
    },
    from,
    checkIns: [],
  });
}

export async function findOrCreateOpenPeriod(
  petId: mongoose.Types.ObjectId,
  user: UserRefInput,
  from: string,
) {
  let period = await OwnershipHistory.findOne({
    petId,
    "user.userId": user.userId,
    $or: [{ to: { $exists: false } }, { to: null }, { to: "" }],
  });
  if (!period) {
    period = await OwnershipHistory.create({
      petId,
      user: {
        userId: user.userId,
        name: user.name,
        avatar: user.avatar ?? undefined,
      },
      from,
      checkIns: [],
    });
  }
  return period;
}

export async function deleteOwnershipForPet(petId: mongoose.Types.ObjectId) {
  await OwnershipHistory.deleteMany({ petId });
}

/** Replace full ownership chain for a pet (used by seed / admin rebuild). */
export async function replaceOwnershipChain(
  petId: mongoose.Types.ObjectId,
  periods: {
    user: UserRefInput;
    from: string;
    to?: string;
    note?: string;
    checkIns?: {
      photoUrl: string;
      caption: string;
      date?: string;
      uploadedBy: UserRefInput;
    }[];
  }[],
) {
  await OwnershipHistory.deleteMany({ petId });
  if (periods.length === 0) return [];
  return OwnershipHistory.insertMany(
    periods.map((p) => ({
      petId,
      user: {
        userId: p.user.userId,
        name: p.user.name,
        avatar: p.user.avatar ?? undefined,
      },
      from: p.from,
      ...(p.to ? { to: p.to } : {}),
      ...(p.note ? { note: p.note } : {}),
      checkIns: (p.checkIns ?? []).map((c) => ({
        photoUrl: c.photoUrl,
        caption: c.caption,
        date: c.date,
        uploadedBy: {
          userId: c.uploadedBy.userId,
          name: c.uploadedBy.name,
          avatar: c.uploadedBy.avatar ?? undefined,
        },
      })),
    })),
  );
}
