import { COLLECTIONS } from './shared/constants/collections';
import { ALERT_TYPES } from './shared/constants/statuses';
import type { NotificationPreference } from './shared/schemas/notification-preference';
import { saveNotificationPreference } from './shared/repositories/notification-preference-repository';
import { resolveDb, resolveLandlordOpenId, type CloudEventBase } from './shared/runtime';

const RULE_TYPE_SET = new Set<string>([
  ALERT_TYPES.expiring,
  ALERT_TYPES.overdue,
  ALERT_TYPES.vacancyLong,
  ALERT_TYPES.manualAbnormal
]);

function normalizeRuleTypes(ruleTypes?: string[]) {
  if (!ruleTypes) {
    return undefined;
  }

  return Array.from(new Set(ruleTypes.filter((item) => RULE_TYPE_SET.has(item)))) as NotificationPreference['enabledRuleTypes'];
}

export interface NotificationPreferencesSaveEvent extends CloudEventBase {
  consentState?: NotificationPreference['consentState'];
  hasRequested?: boolean;
  enabledRuleTypes?: string[];
}

export async function main(event: NotificationPreferencesSaveEvent) {
  const db = resolveDb(event);
  const landlordOpenId = resolveLandlordOpenId(event);
  const preference = await saveNotificationPreference(
    db,
    {
      landlordOpenId,
      consentState: event.consentState,
      hasRequested: event.hasRequested,
      enabledRuleTypes: normalizeRuleTypes(event.enabledRuleTypes)
    },
    event
  );

  return {
    collectionName: COLLECTIONS.notificationPreferences,
    preference
  };
}
