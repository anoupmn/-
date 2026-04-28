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

type NotificationPreferenceRecord = NotificationPreference & {
  _id?: string;
};

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
  const preferences = await listAll<NotificationPreferenceRecord>(db, COLLECTIONS.notificationPreferences);
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

  const { _id, ...currentData } = current as NotificationPreferenceRecord;
  const next: NotificationPreference = {
    ...currentData,
    consentState: input.consentState ?? current.consentState,
    hasRequested: input.hasRequested ?? current.hasRequested,
    enabledRuleTypes: (input.enabledRuleTypes ?? current.enabledRuleTypes).slice(),
    updatedAt: now
  };

  if (_id) {
    await db.collection(COLLECTIONS.notificationPreferences).doc(_id).update({ data: next });
  } else {
    await db.collection(COLLECTIONS.notificationPreferences).where({ id: current.id }).update({ data: next });
  }

  return next;
}
