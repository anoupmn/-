"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateAlerts = evaluateAlerts;
exports.recommend = recommend;
const rentable_unit_1 = require("./rentable-unit");
const statuses_1 = require("../constants/statuses");
const alert_1 = require("../schemas/alert");
const ALERT_PRIORITY = {
    [statuses_1.ALERT_TYPES.overdue]: 400,
    [statuses_1.ALERT_TYPES.manualAbnormal]: 300,
    [statuses_1.ALERT_TYPES.vacancyLong]: 200,
    [statuses_1.ALERT_TYPES.expiring]: 100
};
function buildBaseAlert(params) {
    const { room, asset, landlordOpenId, type, level, title, summary, reason, sourceId, now } = params;
    return alert_1.alertSchema.parse({
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
function evaluateAlerts(input) {
    const { assets, rooms, leases, tenants, bills, abnormalFlags, now } = input;
    const alerts = [];
    rooms.forEach((room) => {
        const asset = assets.find((item) => item.id === room.assetId);
        if (!asset) {
            return;
        }
        const summary = (0, rentable_unit_1.buildRentableUnitSummary)({
            asset,
            room,
            leases,
            tenants,
            bills,
            now
        });
        if (summary.riskTags.includes('overdue')) {
            alerts.push(buildBaseAlert({
                room,
                asset,
                landlordOpenId: room.landlordOpenId,
                type: statuses_1.ALERT_TYPES.overdue,
                level: statuses_1.ALERT_LEVELS.danger,
                title: `${summary.displayName} 已逾期`,
                summary: `${summary.displayName} 已逾期 ${summary.overdueDays} 天`,
                reason: 'overdue',
                now
            }));
        }
        else if (summary.riskTags.includes('expiring')) {
            alerts.push(buildBaseAlert({
                room,
                asset,
                landlordOpenId: room.landlordOpenId,
                type: statuses_1.ALERT_TYPES.expiring,
                level: statuses_1.ALERT_LEVELS.info,
                title: `${summary.displayName} 即将到期`,
                summary: summary.summaryHint || `${summary.displayName} 15 天内到期`,
                reason: 'expiring',
                now
            }));
        }
        if (summary.mainStatus === 'vacant' && summary.vacancyDays >= 15) {
            alerts.push(buildBaseAlert({
                room,
                asset,
                landlordOpenId: room.landlordOpenId,
                type: statuses_1.ALERT_TYPES.vacancyLong,
                level: statuses_1.ALERT_LEVELS.warning,
                title: `${summary.displayName} 空置过久`,
                summary: `${summary.displayName} 已空置 ${summary.vacancyDays} 天`,
                reason: 'vacancy_long',
                now
            }));
        }
        const abnormalFlagCandidates = abnormalFlags.filter((item) => item.roomId === room.id && item.active && item.landlordOpenId === room.landlordOpenId);
        const abnormalFlag = abnormalFlagCandidates.sort((a, b) => {
            const sourceRank = (value) => (value === 'manual' ? 2 : value === 'repair_frequency' ? 1 : 0);
            return sourceRank(b.source ?? 'manual') - sourceRank(a.source ?? 'manual');
        })[0] ?? null;
        if (abnormalFlag) {
            alerts.push(buildBaseAlert({
                room,
                asset,
                landlordOpenId: room.landlordOpenId,
                type: statuses_1.ALERT_TYPES.manualAbnormal,
                level: statuses_1.ALERT_LEVELS.warning,
                title: `${summary.displayName} 异常提醒`,
                summary: abnormalFlag.reason,
                reason: abnormalFlag.reason,
                sourceId: abnormalFlag.id,
                now
            }));
        }
    });
    return alerts.sort((a, b) => ALERT_PRIORITY[b.type] - ALERT_PRIORITY[a.type] || a.roomId.localeCompare(b.roomId));
}
function recommend(alerts) {
    return alerts
        .slice()
        .sort((a, b) => ALERT_PRIORITY[b.type] - ALERT_PRIORITY[a.type] || a.roomId.localeCompare(b.roomId))[0] ?? null;
}
