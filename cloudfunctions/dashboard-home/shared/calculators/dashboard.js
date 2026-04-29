"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recommend = recommend;
exports.buildDashboardPayload = buildDashboardPayload;
const statuses_1 = require("../constants/statuses");
function recommend(alerts) {
    if (alerts.length === 0) {
        return null;
    }
    const top = alerts[0];
    return {
        type: top.type,
        label: '今日建议',
        title: `优先处理${statuses_1.ALERT_TYPE_LABELS[top.type]}`,
        actionLabel: '立即处理',
        actionQuery: top.actionTarget.query
    };
}
function buildDashboardPayload(input) {
    const alertRoomIds = Array.from(new Set(input.alerts.map((item) => item.roomId)));
    const topAlertByRoom = alertRoomIds
        .map((roomId) => input.alerts.find((item) => item.roomId === roomId) ?? null)
        .filter((item) => Boolean(item));
    const recommendation = recommend(input.alerts);
    return {
        overviewCards: [
            {
                key: statuses_1.ALERT_TYPES.overdue,
                label: statuses_1.ALERT_TYPE_LABELS[statuses_1.ALERT_TYPES.overdue],
                count: input.alerts.filter((item) => item.type === statuses_1.ALERT_TYPES.overdue).length,
                query: {
                    alertType: statuses_1.ALERT_TYPES.overdue
                }
            },
            {
                key: statuses_1.ALERT_TYPES.expiring,
                label: statuses_1.ALERT_TYPE_LABELS[statuses_1.ALERT_TYPES.expiring],
                count: input.alerts.filter((item) => item.type === statuses_1.ALERT_TYPES.expiring).length,
                query: {
                    alertType: statuses_1.ALERT_TYPES.expiring
                }
            },
            {
                key: statuses_1.ALERT_TYPES.vacancyLong,
                label: statuses_1.ALERT_TYPE_LABELS[statuses_1.ALERT_TYPES.vacancyLong],
                count: input.alerts.filter((item) => item.type === statuses_1.ALERT_TYPES.vacancyLong).length,
                query: {
                    alertType: statuses_1.ALERT_TYPES.vacancyLong
                }
            },
            {
                key: statuses_1.ALERT_TYPES.manualAbnormal,
                label: statuses_1.ALERT_TYPE_LABELS[statuses_1.ALERT_TYPES.manualAbnormal],
                count: input.alerts.filter((item) => item.type === statuses_1.ALERT_TYPES.manualAbnormal).length,
                query: {
                    alertType: statuses_1.ALERT_TYPES.manualAbnormal
                }
            }
        ],
        abnormalRows: topAlertByRoom.slice(0, 8).map((item) => {
            const unit = input.units.find((unitItem) => unitItem.roomId === item.roomId);
            return {
                roomId: item.roomId,
                type: item.type,
                reasonLabel: statuses_1.ALERT_TYPE_LABELS[item.type],
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
