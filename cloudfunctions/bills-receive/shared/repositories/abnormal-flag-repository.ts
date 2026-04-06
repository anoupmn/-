import { COLLECTIONS } from '../constants/collections';
import { abnormalFlagSchema, type AbnormalFlag } from '../schemas/abnormal-flag';
import { createId, insertRecord, listAll, resolveNow, type CloudEventBase, type DbLike } from '../runtime';

export async function listAbnormalFlags(db: DbLike) {
  return listAll<AbnormalFlag>(db, COLLECTIONS.abnormalFlags);
}

export async function saveAbnormalFlag(
  db: DbLike,
  input: {
    landlordOpenId: string;
    roomId: string;
    reason: string;
    active: boolean;
  },
  event: CloudEventBase
) {
  const now = resolveNow(event);
  const flags = await listAbnormalFlags(db);
  const current = flags.find((item) => item.roomId === input.roomId && item.landlordOpenId === input.landlordOpenId) ?? null;

  if (current) {
    const next = abnormalFlagSchema.parse({
      ...current,
      active: input.active,
      reason: input.active ? input.reason : current.reason,
      updatedAt: now,
      clearedAt: input.active ? null : now
    });

    await db.collection(COLLECTIONS.abnormalFlags).doc(current.id).update({ data: next });
    return next;
  }

  const created = abnormalFlagSchema.parse({
    id: createId('abnormal'),
    landlordOpenId: input.landlordOpenId,
    roomId: input.roomId,
    active: input.active,
    reason: input.reason,
    createdAt: now,
    updatedAt: now,
    clearedAt: input.active ? null : now
  });

  await insertRecord(db, COLLECTIONS.abnormalFlags, created);
  return created;
}
