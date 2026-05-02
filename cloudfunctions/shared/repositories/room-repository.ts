import { COLLECTIONS } from '../constants/collections';
import { roomSchema, type Room, type RoomInput } from '../schemas/room';
import {
  createId,
  findById,
  insertRecord,
  listAll,
  removeRecordsByQuery,
  resolveNow,
  type CloudEventBase,
  type DbLike,
  updateRecord
} from '../runtime';

export async function createRoom(db: DbLike, landlordOpenId: string, input: RoomInput, event: CloudEventBase) {
  const room = roomSchema.parse({
    id: createId('room'),
    landlordOpenId,
    ...input,
    createdAt: resolveNow(event),
    updatedAt: resolveNow(event)
  });

  await insertRecord(db, COLLECTIONS.rooms, room);
  return room;
}

export async function updateRoom(db: DbLike, roomId: string, changes: Partial<RoomInput>, event: CloudEventBase) {
  return updateRecord<Room>(db, COLLECTIONS.rooms, roomId, {
    ...changes,
    updatedAt: resolveNow(event)
  });
}

export async function listRoomsByAsset(db: DbLike, assetId: string) {
  const rooms = await listAll<Room>(db, COLLECTIONS.rooms);
  return rooms.filter((room) => room.assetId === assetId);
}

async function listRoomRecordsSafely<T extends { roomId?: string | null; landlordOpenId?: string }>(
  db: DbLike,
  collectionName: string,
  roomId: string,
  landlordOpenId: string
) {
  try {
    const records = await listAll<T & { id: string }>(db, collectionName);
    return records.filter((record) => record.roomId === roomId && record.landlordOpenId === landlordOpenId);
  } catch {
    return [];
  }
}

export async function getRoomDeleteBlockers(db: DbLike, roomId: string, landlordOpenId: string) {
  const room = await findById<Room>(db, COLLECTIONS.rooms, roomId);
  if (!room || room.landlordOpenId !== landlordOpenId) {
    throw new Error(`Room ${roomId} not found.`);
  }

  const [leases, bills, receipts, repairs, ownerExpenses] = await Promise.all([
    listRoomRecordsSafely(db, COLLECTIONS.leases, roomId, landlordOpenId),
    listRoomRecordsSafely(db, COLLECTIONS.bills, roomId, landlordOpenId),
    listRoomRecordsSafely(db, COLLECTIONS.receipts, roomId, landlordOpenId),
    listRoomRecordsSafely(db, COLLECTIONS.repairRecords, roomId, landlordOpenId),
    listRoomRecordsSafely(db, COLLECTIONS.ownerExpenses, roomId, landlordOpenId)
  ]);

  const blockers: Array<{
    code: 'whole_unit_default' | 'lease' | 'bill' | 'receipt' | 'repair_record' | 'owner_expense';
    count: number;
  }> = [];

  if (room.isWholeUnitDefault) {
    blockers.push({ code: 'whole_unit_default', count: 1 });
  }

  if (leases.length > 0) {
    blockers.push({ code: 'lease', count: leases.length });
  }

  if (bills.length > 0) {
    blockers.push({ code: 'bill', count: bills.length });
  }

  if (receipts.length > 0) {
    blockers.push({ code: 'receipt', count: receipts.length });
  }

  if (repairs.length > 0) {
    blockers.push({ code: 'repair_record', count: repairs.length });
  }

  if (ownerExpenses.length > 0) {
    blockers.push({ code: 'owner_expense', count: ownerExpenses.length });
  }

  return blockers;
}

export async function deleteRoomSafely(
  db: DbLike,
  roomId: string,
  landlordOpenId: string,
  options: { confirm?: boolean } = {}
) {
  const room = await findById<Room>(db, COLLECTIONS.rooms, roomId);
  if (!room || room.landlordOpenId !== landlordOpenId) {
    throw new Error(`Room ${roomId} not found.`);
  }

  const blockers = await getRoomDeleteBlockers(db, roomId, landlordOpenId);
  const summary = {
    canDelete: blockers.length === 0,
    blockers
  };

  if (!summary.canDelete || options.confirm !== true) {
    return {
      ...summary,
      deleted: false
    };
  }

  await removeRecordsByQuery(db, COLLECTIONS.rooms, { id: roomId, landlordOpenId });

  return {
    ...summary,
    deleted: true
  };
}
