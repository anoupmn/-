import { COLLECTIONS } from './shared/constants/collections';
import { REPAIR_CATEGORIES, type RepairCategory } from './shared/constants/repairs';
import { createRepairRecord } from './shared/repositories/repair-record-repository';
import { resolveDb, resolveLandlordOpenId, type CloudEventBase } from './shared/runtime';

export interface RepairRecordSaveEvent extends CloudEventBase {
  roomId?: string;
  assetId?: string;
  category: RepairCategory;
  note: string;
  occurredAt?: string;
}

function isValidCategory(value: string): value is RepairCategory {
  return Object.values(REPAIR_CATEGORIES).includes(value as RepairCategory);
}

export async function main(event: RepairRecordSaveEvent) {
  if (!isValidCategory(event.category)) {
    throw new Error(`Invalid repair category: ${event.category}`);
  }

  const db = resolveDb(event);
  const landlordOpenId = resolveLandlordOpenId(event);
  const record = await createRepairRecord(
    db,
    {
      landlordOpenId,
      roomId: event.roomId,
      assetId: event.assetId,
      category: event.category,
      note: event.note,
      occurredAt: event.occurredAt
    },
    event
  );

  return {
    collectionName: COLLECTIONS.repairRecords,
    record
  };
}
