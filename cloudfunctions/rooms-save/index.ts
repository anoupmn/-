import { createRoom, updateRoom } from '../shared/repositories/room-repository';
import { resolveDb, resolveLandlordOpenId, type CloudEventBase } from '../shared/runtime';
import type { RoomInput } from '../shared/schemas/room';

export interface RoomSaveEvent extends CloudEventBase {
  roomId?: string;
  room: RoomInput;
}

export async function main(event: RoomSaveEvent) {
  const db = resolveDb(event);

  if (event.roomId) {
    return updateRoom(db, event.roomId, event.room, event);
  }

  return createRoom(db, resolveLandlordOpenId(event), event.room, event);
}
