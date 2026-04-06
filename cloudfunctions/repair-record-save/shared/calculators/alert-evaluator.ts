import { buildRentableUnitSummary } from './rentable-unit';
import { ALERT_LEVELS, ALERT_TYPES, type AlertType } from '../constants/statuses';
import { alertSchema, type Alert } from '../schemas/alert';
import type { AbnormalFlag } from '../schemas/abnormal-flag';
import type { Asset } from '../schemas/asset';
import type { Bill } from '../schemas/bill';
import type { Lease } from '../schemas/lease';
import type { Room } from '../schemas/room';
import type { Tenant } from '../schemas/tenant';

export interface AlertEvaluationInput {
  assets: Asset[];
  rooms: Room[];
  leases: Lease[];
  tenants: Tenant[];
  bills: Bill[];
  abnormalFlags: AbnormalFlag[];
  now: string;
}

const ALERT_PRIORITY: Record<AlertType, number> = {
  [ALERT_TYPES.overdue]: 400,
  [ALERT_TYPES.manualAbnormal]: 300,
  [ALERT_TYPES.vacancyLong]: 200,
  [ALERT_TYPES.expiring]: 100
};

function buildBaseAlert(params: {
  room: Room;
  asset: Asset;
  landlordOpenId: string;
  type: AlertType;
  level: Alert['level'];
  title: string;
  summary: string;
  reason: string;
  sourceId?: string;
  now: string;
}): Alert {
  const { room, asset, landlordOpenId, type, level, title, summary, reason, sourceId, now } = params;

  return alertSchema.parse({
    id: `${type}_${room.id}`,
    landlordOpenId,
    roomId: room.id,
    assetId: asset.id,
    type,
    level,
    title,
    summary,
    reason,
    active: true,
    sourceId,
    actionTarget: {
      page: 'units',
      query: {
        alertType: type,
        roomId: room.id
      }
    },
    createdAt: now,
    updatedAt: now
  });
}

export function evaluateAlerts(input: AlertEvaluationInput) {
  const { assets, rooms, leases, tenants, bills, abnormalFlags, now } = input;
  const alerts: Alert[] = [];

  rooms.forEach((room) => {
    const asset = assets.find((item) => item.id === room.assetId);
    if (!asset) {
      return;
    }

    const summary = buildRentableUnitSummary({
      asset,
      room,
      leases,
      tenants,
      bills,
      now
    });

    if (summary.riskTags.includes('overdue')) {
      alerts.push(
        buildBaseAlert({
          room,
          asset,
          landlordOpenId: room.landlordOpenId,
          type: ALERT_TYPES.overdue,
          level: ALERT_LEVELS.danger,
          title: `${summary.displayName} 已逾期`,
          summary: `${summary.displayName} 已逾期 ${summary.overdueDays} 天`,
          reason: 'overdue',
          now
        })
      );
    } else if (summary.riskTags.includes('expiring')) {
      alerts.push(
        buildBaseAlert({
          room,
          asset,
          landlordOpenId: room.landlordOpenId,
          type: ALERT_TYPES.expiring,
          level: ALERT_LEVELS.info,
          title: `${summary.displayName} 即将到期`,
          summary: summary.summaryHint || `${summary.displayName} 15 天内到期`,
          reason: 'expiring',
          now
        })
      );
    }

    if (summary.mainStatus === 'vacant' && summary.vacancyDays >= 15) {
      alerts.push(
        buildBaseAlert({
          room,
          asset,
          landlordOpenId: room.landlordOpenId,
          type: ALERT_TYPES.vacancyLong,
          level: ALERT_LEVELS.warning,
          title: `${summary.displayName} 空置过久`,
          summary: `${summary.displayName} 已空置 ${summary.vacancyDays} 天`,
          reason: 'vacancy_long',
          now
        })
      );
    }

    const abnormalFlagCandidates = abnormalFlags.filter(
      (item) => item.roomId === room.id && item.active && item.landlordOpenId === room.landlordOpenId
    );
    const abnormalFlag =
      abnormalFlagCandidates.sort((a, b) => {
        const sourceRank = (value: string) => (value === 'manual' ? 2 : value === 'repair_frequency' ? 1 : 0);
        return sourceRank(b.source ?? 'manual') - sourceRank(a.source ?? 'manual');
      })[0] ?? null;

    if (abnormalFlag) {
      alerts.push(
        buildBaseAlert({
          room,
          asset,
          landlordOpenId: room.landlordOpenId,
          type: ALERT_TYPES.manualAbnormal,
          level: ALERT_LEVELS.warning,
          title: `${summary.displayName} 异常提醒`,
          summary: abnormalFlag.reason,
          reason: abnormalFlag.reason,
          sourceId: abnormalFlag.id,
          now
        })
      );
    }
  });

  return alerts.sort((a, b) => ALERT_PRIORITY[b.type] - ALERT_PRIORITY[a.type] || a.roomId.localeCompare(b.roomId));
}

export function recommend(alerts: Alert[]) {
  return alerts
    .slice()
    .sort((a, b) => ALERT_PRIORITY[b.type] - ALERT_PRIORITY[a.type] || a.roomId.localeCompare(b.roomId))[0] ?? null;
}
