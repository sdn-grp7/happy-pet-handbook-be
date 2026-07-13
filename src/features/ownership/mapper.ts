type ObjectIdLike = { toString(): string };

type UserRefDoc = {
  userId: ObjectIdLike;
  name: string;
  avatar?: string | null;
};

type CheckInDoc = {
  _id?: ObjectIdLike;
  photoUrl: string;
  caption: string;
  date?: string | null;
  uploadedBy: UserRefDoc;
};

export type OwnershipLean = {
  _id: ObjectIdLike;
  petId: ObjectIdLike;
  user: UserRefDoc;
  from: string;
  to?: string | null;
  note?: string | null;
  checkIns?: CheckInDoc[];
};

function toUserRef(ref: UserRefDoc) {
  return {
    id: ref.userId.toString(),
    name: ref.name,
    ...(ref.avatar ? { avatar: ref.avatar } : {}),
  };
}

/** Public shape compatible with pet.owners on the FE. */
export function toPublicOwners(rows: OwnershipLean[]) {
  return rows.map((o) => ({
    id: o._id.toString(),
    user: toUserRef(o.user),
    from: o.from,
    ...(o.to ? { to: o.to } : {}),
    ...(o.note ? { note: o.note } : {}),
    checkIns: (o.checkIns ?? [])
      .map((c) => ({
        id: c._id?.toString() ?? "",
        photoUrl: c.photoUrl,
        caption: c.caption,
        ...(c.date ? { date: c.date } : {}),
        uploadedBy: toUserRef(c.uploadedBy),
      }))
      .sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return b.date.localeCompare(a.date);
      }),
  }));
}
