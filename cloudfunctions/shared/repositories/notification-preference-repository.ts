import { COLLECTIONS } from '../constants/collections';
import { ALERT_TYPES } from '../constants/statuses';
import type { NotificationPreference } from '../schemas/notification-preference';
import {
  createId,
  insertRecord,
  listAll,
  resolveNow,
  type CloudEventBase,
  type DbLike
} from '../runtime';

const DEFAULT_ENABLED_RULE_TYPES = [
  ALERT_TYPES.expiring,
  ALERT_TYPES.overdue,
  ALERT_TYPES.vacancyLong,
  ALERT_TYPES.manualAbnormal
] as NotificationPreference['enabledRuleTypes'];

function buildDefaultPreference(landlordOpenId: string): NotificationPreference {
  return {
    id: '',
    landlordOpenId,
    consentState: 'unknown',
    hasRequested: false,
    enabledRuleTypes: DEFAULT_ENABLED_RULE_TYPES.slice(),
    createdAt: '',
    updatedAt: ''
  };
}

export async function getNotificationPreference(db: DbLike, landlordOpenId: string) {
  const preferences = await listAll<NotificationPreference>(db, COLLECTIONS.notificationPreferences);
  return preferences.find((item) => item.landlordOpenId === landlordOpenId) ?? buildDefaultPreference(landlordOpenId);
}

export async function saveNotificationPreference(
  db: DbLike,
  input: {
    landlordOpenId: string;
    consentState?: NotificationPreference['consentState'];
    hasRequested?: boolean;
    enabledRuleTypes?: NotificationPreference['enabledRuleTypes'];
  },
  event: CloudEventBase
) {
  const now = resolveNow(event);
  const current = await getNotificationPreference(db, input.landlordOpenId);

  if (!current.id) {
    const created: NotificationPreference = {
      ...buildDefaultPreference(input.landlordOpenId),
      id: createId('notify_pref'),
      consentState: input.consentState ?? 'unknown',
      hasRequested: input.hasRequested ?? false,
      enabledRuleTypes: (input.enabledRuleTypes ?? DEFAULT_ENABLED_RULE_TYPES.slice()).slice(),
      createdAt: now,
      updatedAt: now
    };

    await insertRecord(db, COLLECTIONS.notificationPreferences, created);
    return created;
  }

  const next: NotificationPreference = {
    ...current,
    consentState: input.consentState ?? current.consentState,
    hasRequested: input.hasRequested ?? current.hasRequested,
    enabledRuleTypes: (input.enabledRuleTypes ?? current.enabledRuleTypes).slice(),
    updatedAt: now
  };

  await db.collection(COLLECTIONS.notificationPreferences).doc(current.id).update({ data: next });
  return next;
}
