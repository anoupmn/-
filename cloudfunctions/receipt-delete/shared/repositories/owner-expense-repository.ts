import { COLLECTIONS } from '../constants/collections';
import { REPAIR_CATEGORIES, type RepairCategory } from '../constants/repairs';
import { ownerExpenseInputSchema, ownerExpenseSchema, type OwnerExpense, type OwnerExpenseType } from '../schemas/owner-expense';
import type { Lease } from '../schemas/lease';
import {
  createId,
  insertRecord,
  listAll,
  resolveNow,
  type CloudEventBase,
  type DbLike
} from '../runtime';
import { createRepairRecord } from './repair-record-repository';

function getDateKey(raw: string) {
  return raw.slice(0, 10);
}

function normalizeOccurredAt(inputOccurredAt: string | undefined, event: CloudEventBase) {
  return getDateKey(inputOccurredAt ?? resolveNow(event));
}

function isWithinRange(dateKey: string, startDate: string, endDate: string) {
  return dateKey >= startDate && dateKey <= endDate;
}

function findLeaseByDate(leases: Lease[], occurredAt: string) {
  return (
    leases
      .filter((item) => isWithinRange(occurredAt, item.startDate, item.endDate))
      .sort((a, b) => b.startDate.localeCompare(a.startDate))[0] ?? null
  );
}

export async function listOwnerExpenses(db: DbLike) {
  return listAll<OwnerExpense>(db, COLLECTIONS.ownerExpenses);
}

export async function listOwnerExpensesByRoom(db: DbLike, roomId: string, landlordOpenId?: string) {
  const expenses = await listOwnerExpenses(db);
  return expenses
    .filter((item) => item.roomId === roomId)
    .filter((item) => !landlordOpenId || item.landlordOpenId === landlordOpenId)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.updatedAt.localeCompare(a.updatedAt));
}

export function buildOwnerExpenseSummary(expenses: OwnerExpense[]) {
  const totalAmount = expenses.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const amountByType = expenses.reduce<Record<OwnerExpenseType, number>>(
    (acc, item) => ({
      ...acc,
      [item.expenseType]: acc[item.expenseType] + (item.amount ?? 0)
    }),
    {
      repair: 0,
      cleaning: 0,
      caretaking: 0,
      labor: 0,
      other: 0
    }
  );

  return {
    count: expenses.length,
    totalAmount,
    amountByType
  };
}

export async function createOwnerExpense(
  db: DbLike,
  rawInput: {
    landlordOpenId: string;
    assetId?: string;
    roomId?: string;
    expenseType: OwnerExpenseType;
    amount?: number | null;
    note?: string;
    occurredAt?: string;
    repairCategory?: RepairCategory;
  },
  event: CloudEventBase
) {
  const input = ownerExpenseInputSchema.parse(rawInput);
  const occurredAt = normalizeOccurredAt(input.occurredAt, event);
  const now = resolveNow(event);

  const [assets, rooms, leases] = await Promise.all([
    listAll<{ id: string; landlordOpenId: string }>(db, COLLECTIONS.assets),
    listAll<{ id: string; landlordOpenId: string; assetId: string }>(db, COLLECTIONS.rooms),
    listAll<Lease>(db, COLLECTIONS.leases)
  ]);

  const room = input.roomId
    ? rooms.find((item) => item.id === input.roomId && item.landlordOpenId === rawInput.landlordOpenId)
    : null;
  if (input.roomId && !room) {
    throw new Error(`Room ${input.roomId} not found.`);
  }

  const assetId = room?.assetId ?? input.assetId;
  if (!assetId) {
    throw new Error('assetId or roomId is required.');
  }

  const asset = assets.find((item) => item.id === assetId && item.landlordOpenId === rawInput.landlordOpenId);
  if (!asset) {
    throw new Error(`Asset ${assetId} not found.`);
  }

  const lease = room
    ? findLeaseByDate(
        leases.filter((item) => item.roomId === room.id && item.landlordOpenId === rawInput.landlordOpenId),
        occurredAt
      )
    : null;
  let repairRecordId: string | null = null;

  if (input.expenseType === 'repair') {
    const note = String(input.note || '').trim();
    if (!note) {
      throw new Error('Repair expense note is required.');
    }

    const repairRecord = await createRepairRecord(
      db,
      {
        landlordOpenId: rawInput.landlordOpenId,
        roomId: room?.id,
        assetId,
        category: input.repairCategory ?? REPAIR_CATEGORIES.other,
        note,
        occurredAt
      },
      event
    );
    repairRecordId = repairRecord.id;
  }

  const expense = ownerExpenseSchema.parse({
    id: createId('expense'),
    landlordOpenId: rawInput.landlordOpenId,
    assetId,
    roomId: room?.id ?? null,
    leaseId: lease?.id ?? null,
    tenantId: lease?.tenantId ?? null,
    repairRecordId,
    expenseType: input.expenseType,
    amount: input.amount ?? null,
    note: String(input.note || '').trim(),
    occurredAt,
    monthKey: occurredAt.slice(0, 7),
    createdAt: now,
    updatedAt: now
  });

  await insertRecord(db, COLLECTIONS.ownerExpenses, expense);
  return expense;
}
