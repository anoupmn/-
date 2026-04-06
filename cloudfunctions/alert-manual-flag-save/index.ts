import { saveAbnormalFlag } from './shared/repositories/abnormal-flag-repository';
import { COLLECTIONS } from './shared/constants/collections';
import { resolveDb, resolveLandlordOpenId, type CloudEventBase } from './shared/runtime';

export interface AlertManualFlagSaveEvent extends CloudEventBase {
  roomId: string;
  reason: string;
  active: boolean;
}

export async function main(event: AlertManualFlagSaveEvent) {
  const db = resolveDb(event);
  const landlordOpenId = resolveLandlordOpenId(event);
  const flag = await saveAbnormalFlag(
    db,
    {
      landlordOpenId,
      roomId: event.roomId,
      reason: event.reason,
      active: event.active
    },
    event
  );

  return {
    collectionName: COLLECTIONS.abnormalFlags,
    flag
  };
}
