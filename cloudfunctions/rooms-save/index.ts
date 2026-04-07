import { createRoom, updateRoom } from './shared/repositories/room-repository';
import { COLLECTIONS } from './shared/constants/collections';
import { listAll, resolveDb, resolveLandlordOpenId, type CloudEventBase } from './shared/runtime';
import type { RoomInput } from './shared/schemas/room';

export interface RoomSaveEvent extends CloudEventBase {
  roomId?: string;
  room: RoomInput;
}

export async function main(event: RoomSaveEvent) {
  const db = resolveDb(event);
  const landlordOpenId = resolveLandlordOpenId(event);

  const assets = await listAll<{ id: string; landlordOpenId: string }>(db, COLLECTIONS.assets);
  const targetAsset = assets.find((item) => item.id === event.room.assetId && item.landlordOpenId === landlordOpenId);
  if (!targetAsset) {
    throw new Error(`Asset ${event.room.assetId} not found.`);
  }

  if (event.roomId) {
    const rooms = await listAll<{ id: string; landlordOpenId: string }>(db, COLLECTIONS.rooms);
    const ownedRoom = rooms.find((item) => item.id === event.roomId && item.landlordOpenId === landlordOpenId);

    if (!ownedRoom) {
      throw new Error(`Room ${event.roomId} not found.`);
    }

    return updateRoom(db, event.roomId, event.room, event);
  }

  return createRoom(db, landlordOpenId, event.room, event);
}
