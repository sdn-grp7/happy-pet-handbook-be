import { OwnershipHistory } from "../ownership/model.js";

type OwnerUser = {
  userId: { toString(): string };
  name: string;
  avatar?: string | null;
};

export type OwnershipPeriod = {
  user: OwnerUser;
  from: string;
  to?: string | null;
};

export type PetOwnershipView = {
  periods: OwnershipPeriod[];
  adoptedBy?: OwnerUser | null;
};

function ownerUserId(period: OwnershipPeriod): string {
  return period.user.userId.toString();
}

export function getCurrentOwner(view: PetOwnershipView): OwnerUser | null {
  const open = view.periods.find((o) => !o.to);
  if (open) return open.user;
  return view.adoptedBy ?? null;
}

export function getPriorOwners(view: PetOwnershipView): OwnershipPeriod[] {
  return view.periods.filter((o) => Boolean(o.to));
}

function isPriorOwner(view: PetOwnershipView, userId: string): boolean {
  return getPriorOwners(view).some((o) => ownerUserId(o) === userId);
}

/**
 * Any prior owner (closed period in OwnershipHistory) may rate the current owner.
 */
export function canPriorOwnerRateSuccessor(
  view: PetOwnershipView,
  reviewerId: string,
  revieweeId: string,
): boolean {
  if (reviewerId === revieweeId) return false;
  if (!isPriorOwner(view, reviewerId)) return false;
  const current = getCurrentOwner(view);
  if (!current) return false;
  return current.userId.toString() === revieweeId;
}

export function listRateableSuccessors(
  view: PetOwnershipView,
  reviewerId: string,
): { revieweeId: string; revieweeName: string; revieweeAvatar?: string }[] {
  if (!isPriorOwner(view, reviewerId)) return [];
  const current = getCurrentOwner(view);
  if (!current) return [];
  const id = current.userId.toString();
  if (id === reviewerId) return [];
  return [
    {
      revieweeId: id,
      revieweeName: current.name,
      ...(current.avatar ? { revieweeAvatar: current.avatar } : {}),
    },
  ];
}

export async function loadPetOwnershipView(
  petId: { toString(): string },
  adoptedBy?: OwnerUser | null,
): Promise<PetOwnershipView> {
  const periods = await OwnershipHistory.find({ petId })
    .sort({ from: 1, createdAt: 1 })
    .lean();
  return {
    periods: periods.map((p) => ({
      user: p.user,
      from: p.from,
      ...(p.to ? { to: p.to } : {}),
    })),
    adoptedBy: adoptedBy ?? null,
  };
}
