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
  subscriptionState: Pick<NotificationPreference, 'hasRequested' | 'enabledRuleTypes'>;
}) {
  const abnormalAlerts = input.alerts.filter((item) => item.type !== ALERT_TYPES.expiring);
  const abnormalRoomIds = Array.from(new Set(abnormalAlerts.map((item) => item.roomId)));
  const topAlertByRoom = abnormalRoomIds
    .map((roomId) => abnormalAlerts.find((item) => item.roomId === roomId) ?? null)
    .filter((item): item is Alert => Boolean(item));
  const recommendation = recommend(input.alerts);

  return {
    overviewCards: [
      {
        key: ALERT_TYPES.expiring,
        label: '15 天内到期',
        count: input.alerts.filter((item) => item.type === ALERT_TYPES.expiring).length,
        query: {
          alertType: ALERT_TYPES.expiring
        }
      },
      {
        key: 'vacant',
        label: '当前空置',
        count: input.units.filter((item) => item.mainStatus === 'vacant').length,
        query: {
          mainStatus: 'vacant'
        }
      },
      {
        key: 'abnormal',
        label: '异常',
        count: abnormalRoomIds.length,
        query: {
          bucket: 'abnormal'
        }
      }
    ],
    abnormalRows: topAlertByRoom.slice(0, 5).map((item) => {
      const unit = input.units.find((unitItem) => unitItem.roomId === item.roomId);
      return {
        roomId: item.roomId,
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
