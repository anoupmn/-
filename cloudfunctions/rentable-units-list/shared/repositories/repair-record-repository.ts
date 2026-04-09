import { COLLECTIONS } from '../constants/collections';
import {
  REPAIR_CATEGORY_LABELS,
  REPAIR_FREQUENCY_THRESHOLD,
  REPAIR_FREQUENCY_WINDOW_DAYS,
  type RepairCategory
} from '../constants/repairs';
import { repairRecordInputSchema, repairRecordSchema, type RepairRecord } from '../schemas/repair-record';
import type { Lease } from '../schemas/lease';
import {
  createId,
  insertRecord,
  listAll,
  resolveNow,
  type CloudEventBase,
  type DbLike
} from '../runtime';

function getDateKey(raw: string) {
  return raw.slice(0, 10);
}

function isWithinRange(dateKey: string, startDate: string, endDate: string) {
  return dateKey >= startDate && dateKey <= endDate;
}

function resolveLeaseActualEndDate(lease: Pick<Lease, 'endDate' | 'closedAt'>) {
  const closedDate = lease.closedAt ? lease.closedAt.slice(0, 10) : '';
  if (closedDate && closedDate < lease.endDate) {
    return closedDate;
  }

  return lease.endDate;
}

function findLeaseByDate(leases: Lease[], occurredAt: string) {
  return (
    leases
      .filter((item) => isWithinRange(occurredAt, item.startDate, resolveLeaseActualEndDate(item)))
      .sort((a, b) => b.startDate.localeCompare(a.startDate))[0] ?? null
  );
}

function toUtcTime(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000Z`).getTime();
}

function normalizeOccurredAt(inputOccurredAt: string | undefined, event: CloudEventBase) {
  const fallback = getDateKey(resolveNow(event));
  return getDateKey(inputOccurredAt ?? fallback);
}

export async function listRepairRecords(db: DbLike) {
  return listAll<RepairRecord>(db, COLLECTIONS.repairRecords);
}

export interface RepairCategoryStat {
  category: RepairCategory;
  label: string;
  count: number;
}

export interface RepairLeasePeriodStat {
  leaseId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  count: number;
}

export interface RoomRepairStats {
  roomId: string;
  totalCount: number;
  recent30dCount: number;
  topCategories: RepairCategoryStat[];
  perLeaseCounts: RepairLeasePeriodStat[];
  abnormal: {
    active: boolean;
    reason: string;
    threshold: number;
    windowDays: number;
  };
}

export function buildRoomRepairStats(input: {
  roomId: string;
  leases: Lease[];
  records: RepairRecord[];
  now: string;
  topN?: number;
}) {
  const { roomId, leases, records, now, topN = 3 } = input;
  const roomRecords = records.filter((item) => item.roomId === roomId);
  const nowMs = toUtcTime(getDateKey(now));

  const recent30dCount = roomRecords.filter((item) => {
    const diffMs = nowMs - toUtcTime(item.occurredAt);
    return diffMs >= 0 && diffMs <= REPAIR_FREQUENCY_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  }).length;

  const categoryMap = roomRecords.reduce<Record<RepairCategory, number>>(
    (acc, item) => ({
      ...acc,
      [item.category]: (acc[item.category] ?? 0) + 1
    }),
    {
      plumbing: 0,
      electrical: 0,
      appliance: 0,
      structure: 0,
      safety: 0,
      other: 0
    }
  );

  const topCategories = Object.entries(categoryMap)
    .filter(([, count]) => count > 0)
    .map(([category, count]) => ({
      category: category as RepairCategory,
      label: REPAIR_CATEGORY_LABELS[category as RepairCategory],
      count
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, topN);

  const perLeaseCounts = leases
    .filter((item) => item.roomId === roomId)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((lease) => {
      const actualEndDate = resolveLeaseActualEndDate(lease);
      return {
        leaseId: lease.id,
        tenantId: lease.tenantId,
        startDate: lease.startDate,
        endDate: actualEndDate,
        count: roomRecords.filter((record) => isWithinRange(record.occurredAt, lease.startDate, actualEndDate)).length
      };
    });

  return {
    roomId,
    totalCount: roomRecords.length,
    recent30dCount,
    topCategories,
    perLeaseCounts,
    abnormal: {
      active: recent30dCount >= REPAIR_FREQUENCY_THRESHOLD,
      reason: `近 ${REPAIR_FREQUENCY_WINDOW_DAYS} 天维修 ${recent30dCount} 次`,
      threshold: REPAIR_FREQUENCY_THRESHOLD,
      windowDays: REPAIR_FREQUENCY_WINDOW_DAYS
    }
  } as RoomRepairStats;
}

export async function createRepairRecord(
  db: DbLike,
  rawInput: {
    landlordOpenId: string;
    roomId?: string;
    assetId?: string;
    category: RepairCategory;
    note: string;
    occurredAt?: string;
  },
  event: CloudEventBase
) {
  const input = repairRecordInputSchema.parse(rawInput);
  const occurredAt = normalizeOccurredAt(input.occurredAt, event);
  const now = resolveNow(event);

  const [assets, rooms, leases] = await Promise.all([
    listAll<{ id: string; landlordOpenId: string }>(db, COLLECTIONS.assets),
    listAll<{ id: string; landlordOpenId: string; assetId: string }>(db, COLLECTIONS.rooms),
    listAll<Lease>(db, COLLECTIONS.leases)
  ]);

  const room = input.roomId ? rooms.find((item) => item.id === input.roomId && item.landlordOpenId === rawInput.landlordOpenId) : null;
  if (input.roomId && !room) {
    throw new Error(`Room ${input.roomId} not found.`);
  }

  const resolvedAssetId = room?.assetId ?? input.assetId;
  if (!resolvedAssetId) {
    throw new Error('assetId or roomId is required.');
  }

  const asset = assets.find((item) => item.id === resolvedAssetId && item.landlordOpenId === rawInput.landlordOpenId);
  if (!asset) {
    throw new Error(`Asset ${resolvedAssetId} not found.`);
  }

  const lease = room
    ? findLeaseByDate(
        leases.filter((item) => item.roomId === room.id && item.landlordOpenId === rawInput.landlordOpenId),
        occurredAt
      )
    : null;

  const record = repairRecordSchema.parse({
    id: createId('repair'),
    landlordOpenId: rawInput.landlordOpenId,
    assetId: resolvedAssetId,
    roomId: room?.id ?? null,
    leaseId: lease?.id ?? null,
    tenantId: lease?.tenantId ?? null,
    category: input.category,
    note: input.note.trim(),
    occurredAt,
    createdAt: now,
    updatedAt: now
  });

  await insertRecord(db, COLLECTIONS.repairRecords, record);
  return record;
}
