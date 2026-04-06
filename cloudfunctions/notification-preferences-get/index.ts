import { COLLECTIONS } from './shared/constants/collections';
import { getNotificationPreference } from './shared/repositories/notification-preference-repository';
import { resolveDb, resolveLandlordOpenId, type CloudEventBase } from './shared/runtime';

export async function main(event: CloudEventBase) {
  const db = resolveDb(event);
  const landlordOpenId = resolveLandlordOpenId(event);
  const preference = await getNotificationPreference(db, landlordOpenId);

  return {
    collectionName: COLLECTIONS.notificationPreferences,
    preference
  };
}
