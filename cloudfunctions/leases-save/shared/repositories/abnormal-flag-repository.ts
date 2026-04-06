import { COLLECTIONS } from '../constants/collections';
import { abnormalFlagSchema, type AbnormalFlag } from '../schemas/abnormal-flag';
import type { Lease } from '../schemas/lease';
import type { RepairRecord } from '../schemas/repair-record';
import type { Room } from '../schemas/room';
import { buildRoomRepairStats } from './repair-record-repository';
import { createId, insertRecord, listAll, resolveNow, type CloudEventBase, type DbLike } from '../runtime';

type AbnormalFlagSource = AbnormalFlag['source'];

function normalizeSource(value: AbnormalFlagSource | undefined): AbnormalFlagSource {
  return value ?? 'manual';
}

export async function listAbnormalFlags(db: DbLike) {
  const records = await listAll<AbnormalFlag>(db, COLLECTIONS.abnormalFlags);
  return records.map((item) =>
    abnormalFlagSchema.parse({
      ...item,
      source: normalizeSource(item.source)
    })
  );
}

export async function saveAbnormalFlag(
  db: DbLike,
  input: {
    landlordOpenId: string;
    roomId: string;
    source?: AbnormalFlagSource;
    reason: string;
    active: boolean;
  },
  event: CloudEventBase
) {
  const now = resolveNow(event);
  const source = normalizeSource(input.source);
  const flags = await listAbnormalFlags(db);
  const current =
    flags.find(
      (item) =>
        item.roomId === input.roomId &&
        item.landlordOpenId === input.landlordOpenId &&
        normalizeSource(item.source) === source
    ) ?? null;

  if (current) {
    const next = abnormalFlagSchema.parse({
      ...current,
      source,
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
    source,
    active: input.active,
    reason: input.reason,
    createdAt: now,
    updatedAt: now,
    clearedAt: input.active ? null : now
  });

  await insertRecord(db, COLLECTIONS.abnormalFlags, created);
  return created;
}

export async function syncRepairFrequencyAbnormalFlags(
  db: DbLike,
  input: {
    rooms: Room[];
    leases: Lease[];
    repairs: RepairRecord[];
    now: string;
  },
  event: CloudEventBase
) {
  const landlords = Array.from(new Set(input.rooms.map((room) => room.landlordOpenId)));

  for (const landlordOpenId of landlords) {
    const landlordRooms = input.rooms.filter((room) => room.landlordOpenId === landlordOpenId);
    const landlordLeases = input.leases.filter((lease) => lease.landlordOpenId === landlordOpenId);
    const landlordRepairs = input.repairs.filter((repair) => repair.landlordOpenId === landlordOpenId);

    for (const room of landlordRooms) {
      const stats = buildRoomRepairStats({
        roomId: room.id,
        leases: landlordLeases,
        records: landlordRepairs,
        now: input.now
      });

      await saveAbnormalFlag(
        db,
        {
          landlordOpenId,
          roomId: room.id,
          source: 'repair_frequency',
          reason: stats.abnormal.reason,
          active: stats.abnormal.active
        },
        event
      );
    }
  }
}
