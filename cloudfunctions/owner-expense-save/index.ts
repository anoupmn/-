import { COLLECTIONS } from './shared/constants/collections';
import { REPAIR_CATEGORIES, type RepairCategory } from './shared/constants/repairs';
import { createOwnerExpense } from './shared/repositories/owner-expense-repository';
import { ownerExpenseTypeSchema, type OwnerExpenseType } from './shared/schemas/owner-expense';
import { resolveDb, resolveLandlordOpenId, type CloudEventBase } from './shared/runtime';

export interface OwnerExpenseSaveEvent extends CloudEventBase {
  assetId?: string;
  roomId?: string;
  expenseType: OwnerExpenseType;
  amount?: number | null;
  note?: string;
  occurredAt?: string;
  repairCategory?: RepairCategory;
}

function isValidRepairCategory(value: string | undefined): value is RepairCategory {
  if (!value) {
    return true;
  }

  return Object.values(REPAIR_CATEGORIES).includes(value as RepairCategory);
}

export async function main(event: OwnerExpenseSaveEvent) {
  const expenseType = ownerExpenseTypeSchema.parse(event.expenseType);
  if (!isValidRepairCategory(event.repairCategory)) {
    throw new Error(`Invalid repair category: ${event.repairCategory}`);
  }

  const db = resolveDb(event);
  const landlordOpenId = resolveLandlordOpenId(event);
  const expense = await createOwnerExpense(
    db,
    {
      landlordOpenId,
      assetId: event.assetId,
      roomId: event.roomId,
      expenseType,
      amount: event.amount ?? null,
      note: event.note,
      occurredAt: event.occurredAt,
      repairCategory: event.repairCategory
    },
    event
  );

  return {
    collectionName: COLLECTIONS.ownerExpenses,
    expense
  };
}
