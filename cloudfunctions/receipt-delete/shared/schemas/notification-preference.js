"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationPreferenceSchema = void 0;
const zod_1 = require("zod");
const statuses_1 = require("../constants/statuses");
exports.notificationPreferenceSchema = zod_1.z.object({
    id: zod_1.z.string(),
    landlordOpenId: zod_1.z.string(),
    consentState: zod_1.z.enum(['unknown', 'accepted', 'rejected']),
    hasRequested: zod_1.z.boolean(),
    enabledRuleTypes: zod_1.z.array(zod_1.z.enum([statuses_1.ALERT_TYPES.expiring, statuses_1.ALERT_TYPES.overdue, statuses_1.ALERT_TYPES.vacancyLong, statuses_1.ALERT_TYPES.manualAbnormal])),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string()
});
