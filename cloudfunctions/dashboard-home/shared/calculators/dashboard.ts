import { ALERT_TYPE_LABELS, ALERT_TYPES } from '../constants/statuses';
import type { Alert } from '../schemas/alert';
import type { NotificationPreference } from '../schemas/notification-preference';
import type { RentableUnitSummary } from './rentable-unit';

export function recommend(alerts: Alert[]) {
  if (alerts.length === 0) {
    return null;
  }

  const top = alerts[0];

  return {
    type: top.type,
    label: '今日建议',
    title: `优先处理${ALERT_TYPE_LABELS[top.type]}`,
    actionLabel: '立即处理',
    actionQuery: top.actionTarget.query
  };
}

export function buildDashboardPayload(input: {
  alerts: Alert[];
  units: RentableUnitSummary[];
  subscriptionState: Pick<NotificationPreference, 'consentState' | 'hasRequested' | 'enabledRuleTypes'>;
}) {
  const alertRoomIds = Array.from(new Set(input.alerts.map((item) => item.roomId)));
  const topAlertByRoom = alertRoomIds
    .map((roomId) => input.alerts.find((item) => item.roomId === roomId) ?? null)
    .filter((item): item is Alert => Boolean(item));
  const recommendation = recommend(input.alerts);

  return {
    overviewCards: [
      {
        key: ALERT_TYPES.overdue,
        label: ALERT_TYPE_LABELS[ALERT_TYPES.overdue],
        count: input.alerts.filter((item) => item.type === ALERT_TYPES.overdue).length,
        query: {
          alertType: ALERT_TYPES.overdue
        }
      },
      {
        key: ALERT_TYPES.expiring,
        label: ALERT_TYPE_LABELS[ALERT_TYPES.expiring],
        count: input.alerts.filter((item) => item.type === ALERT_TYPES.expiring).length,
        query: {
          alertType: ALERT_TYPES.expiring
        }
      },
      {
        key: ALERT_TYPES.vacancyLong,
        label: ALERT_TYPE_LABELS[ALERT_TYPES.vacancyLong],
        count: input.alerts.filter((item) => item.type === ALERT_TYPES.vacancyLong).length,
        query: {
          alertType: ALERT_TYPES.vacancyLong
        }
      },
      {
        key: ALERT_TYPES.manualAbnormal,
        label: ALERT_TYPE_LABELS[ALERT_TYPES.manualAbnormal],
        count: input.alerts.filter((item) => item.type === ALERT_TYPES.manualAbnormal).length,
        query: {
          alertType: ALERT_TYPES.manualAbnormal
        }
      }
    ],
    abnormalRows: topAlertByRoom.slice(0, 8).map((item) => {
      const unit = input.units.find((unitItem) => unitItem.roomId === item.roomId);
      return {
        roomId: item.roomId,
        type: item.type,
        reasonLabel: ALERT_TYPE_LABELS[item.type],
        displayName: unit?.displayName ?? item.title,
        primaryReason: item.summary.includes('逾期') ? item.summary : item.title,
        supportingText: item.summary,
        query: item.actionTarget.query
      };
    }),
    recommendation,
    subscriptionState: input.subscriptionState
  };
}
