import { COLLECTIONS } from '../constants/collections';
import type { NotificationPreference } from '../schemas/notification-preference';
import { listAll, type DbLike } from '../runtime';

export async function getNotificationPreference(db: DbLike, landlordOpenId: string) {
  const preferences = await listAll<NotificationPreference>(db, COLLECTIONS.notificationPreferences);
  return (
    preferences.find((item) => item.landlordOpenId === landlordOpenId) ?? {
      id: '',
      landlordOpenId,
      consentState: 'unknown' as const,
      hasRequested: false,
      enabledRuleTypes: [],
      createdAt: '',
      updatedAt: ''
    }
  );
}
