"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const collections_1 = require("./shared/constants/collections");
const statuses_1 = require("./shared/constants/statuses");
const notification_preference_repository_1 = require("./shared/repositories/notification-preference-repository");
const runtime_1 = require("./shared/runtime");
const RULE_TYPE_SET = new Set([
    statuses_1.ALERT_TYPES.expiring,
    statuses_1.ALERT_TYPES.overdue,
    statuses_1.ALERT_TYPES.vacancyLong,
    statuses_1.ALERT_TYPES.manualAbnormal
]);
function normalizeRuleTypes(ruleTypes) {
    if (!ruleTypes) {
        return undefined;
    }
    return Array.from(new Set(ruleTypes.filter((item) => RULE_TYPE_SET.has(item))));
}
async function main(event) {
    const db = (0, runtime_1.resolveDb)(event);
    const landlordOpenId = (0, runtime_1.resolveLandlordOpenId)(event);
    const preference = await (0, notification_preference_repository_1.saveNotificationPreference)(db, {
        landlordOpenId,
        consentState: event.consentState,
        hasRequested: event.hasRequested,
        enabledRuleTypes: normalizeRuleTypes(event.enabledRuleTypes)
    }, event);
    return {
        collectionName: collections_1.COLLECTIONS.notificationPreferences,
        preference
    };
}
