"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.abnormalFlagSchema = void 0;
const zod_1 = require("zod");
exports.abnormalFlagSchema = zod_1.z.object({
    id: zod_1.z.string(),
    landlordOpenId: zod_1.z.string(),
    roomId: zod_1.z.string(),
    source: zod_1.z.enum(['manual', 'repair_frequency']).default('manual'),
    active: zod_1.z.boolean(),
    reason: zod_1.z.string(),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
    clearedAt: zod_1.z.string().nullable()
});
