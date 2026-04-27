import { COLLECTIONS } from '../constants/collections';
import { roomSchema, type Room, type RoomInput } from '../schemas/room';
import { createId, insertRecord, listAll, resolveNow, type CloudEventBase, type DbLike, updateRecord } from '../runtime';

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
