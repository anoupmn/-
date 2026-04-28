"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotificationPreference = getNotificationPreference;
exports.saveNotificationPreference = saveNotificationPreference;
const collections_1 = require("../constants/collections");
const statuses_1 = require("../constants/statuses");
const runtime_1 = require("../runtime");
const DEFAULT_ENABLED_RULE_TYPES = [
    statuses_1.ALERT_TYPES.expiring,
    statuses_1.ALERT_TYPES.overdue,
    statuses_1.ALERT_TYPES.vacancyLong,
    statuses_1.ALERT_TYPES.manualAbnormal
];
function buildDefaultPreference(landlordOpenId) {
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
async function getNotificationPreference(db, landlordOpenId) {
    const preferences = await (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.notificationPreferences);
    return preferences.find((item) => item.landlordOpenId === landlordOpenId) ?? buildDefaultPreference(landlordOpenId);
}
async function saveNotificationPreference(db, input, event) {
    const now = (0, runtime_1.resolveNow)(event);
    const current = await getNotificationPreference(db, input.landlordOpenId);
    if (!current.id) {
        const created = {
            ...buildDefaultPreference(input.landlordOpenId),
            id: (0, runtime_1.createId)('notify_pref'),
            consentState: input.consentState ?? 'unknown',
            hasRequested: input.hasRequested ?? false,
            enabledRuleTypes: (input.enabledRuleTypes ?? DEFAULT_ENABLED_RULE_TYPES.slice()).slice(),
            createdAt: now,
            updatedAt: now
        };
        await (0, runtime_1.insertRecord)(db, collections_1.COLLECTIONS.notificationPreferences, created);
        return created;
    }
    const { _id, ...currentData } = current;
    const next = {
        ...currentData,
        consentState: input.consentState ?? current.consentState,
        hasRequested: input.hasRequested ?? current.hasRequested,
        enabledRuleTypes: (input.enabledRuleTypes ?? current.enabledRuleTypes).slice(),
        updatedAt: now
    };
    if (_id) {
        await db.collection(collections_1.COLLECTIONS.notificationPreferences).doc(_id).update({ data: next });
    }
    else {
        await db.collection(collections_1.COLLECTIONS.notificationPreferences).where({ id: current.id }).update({ data: next });
    }
    return next;
}
