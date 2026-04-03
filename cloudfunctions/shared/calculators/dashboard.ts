import { ALERT_TYPE_LABELS } from '../constants/statuses';
import type { Alert } from '../schemas/alert';

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
