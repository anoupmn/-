"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.repairRecordInputSchema = exports.repairRecordSchema = void 0;
const zod_1 = require("zod");
const repairs_1 = require("../constants/repairs");
const dateStringSchema = zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
exports.repairRecordSchema = zod_1.z.object({
    id: zod_1.z.string(),
    landlordOpenId: zod_1.z.string(),
    assetId: zod_1.z.string(),
    roomId: zod_1.z.string().nullable(),
    leaseId: zod_1.z.string().nullable(),
    tenantId: zod_1.z.string().nullable(),
    category: zod_1.z.enum([
        repairs_1.REPAIR_CATEGORIES.plumbing,
        repairs_1.REPAIR_CATEGORIES.electrical,
        repairs_1.REPAIR_CATEGORIES.appliance,
        repairs_1.REPAIR_CATEGORIES.structure,
        repairs_1.REPAIR_CATEGORIES.safety,
        repairs_1.REPAIR_CATEGORIES.other
    ]),
    note: zod_1.z.string().trim().min(1),
    occurredAt: dateStringSchema,
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string()
});
exports.repairRecordInputSchema = zod_1.z
    .object({
    assetId: zod_1.z.string().optional(),
    roomId: zod_1.z.string().optional(),
    category: exports.repairRecordSchema.shape.category,
    note: zod_1.z.string().trim().min(1),
    occurredAt: dateStringSchema.optional()
})
    .refine((value) => Boolean(value.assetId || value.roomId), {
    message: 'assetId or roomId is required'
});
