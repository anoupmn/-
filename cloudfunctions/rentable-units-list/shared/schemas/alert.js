"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.alertSchema = exports.alertActionTargetSchema = void 0;
const zod_1 = require("zod");
const statuses_1 = require("../constants/statuses");
exports.alertActionTargetSchema = zod_1.z.object({
    page: zod_1.z.enum(['units', 'unit-detail']),
    query: zod_1.z.record(zod_1.z.string(), zod_1.z.string())
});
exports.alertSchema = zod_1.z.object({
    id: zod_1.z.string(),
    landlordOpenId: zod_1.z.string(),
    roomId: zod_1.z.string(),
    assetId: zod_1.z.string(),
    type: zod_1.z.enum([statuses_1.ALERT_TYPES.expiring, statuses_1.ALERT_TYPES.overdue, statuses_1.ALERT_TYPES.vacancyLong, statuses_1.ALERT_TYPES.manualAbnormal]),
    level: zod_1.z.enum([statuses_1.ALERT_LEVELS.info, statuses_1.ALERT_LEVELS.warning, statuses_1.ALERT_LEVELS.danger]),
    title: zod_1.z.string(),
    summary: zod_1.z.string(),
    reason: zod_1.z.string(),
    active: zod_1.z.boolean(),
    sourceId: zod_1.z.string().optional(),
    actionTarget: exports.alertActionTargetSchema,
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string()
});
