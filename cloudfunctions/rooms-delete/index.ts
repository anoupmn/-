import { deleteRoomSafely } from '../shared/repositories/room-repository';
import { resolveDb, resolveLandlordOpenId, type CloudEventBase } from '../shared/runtime';

export interface RoomsDeleteEvent extends CloudEventBase {
  roomId: string;
  mode?: 'check' | 'delete';
  confirm?: boolean;
}

export async function main(event: RoomsDeleteEvent) {
  const roomId = String(event.roomId || '').trim();
  if (!roomId) {
    throw new Error('roomId is required.');
  }

  const db = resolveDb(event);
  const landlordOpenId = resolveLandlordOpenId(event);
  const mode = event.mode ?? 'check';

  return deleteRoomSafely(db, roomId, landlordOpenId, {
    confirm: mode === 'delete' && event.confirm === true
  });
}
