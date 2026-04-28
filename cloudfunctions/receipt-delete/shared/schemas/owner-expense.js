"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ownerExpenseInputSchema = exports.ownerExpenseSchema = exports.ownerExpenseTypeSchema = void 0;
const zod_1 = require("zod");
const dateStringSchema = zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
exports.ownerExpenseTypeSchema = zod_1.z.enum(['repair', 'cleaning', 'caretaking', 'labor', 'other']);
exports.ownerExpenseSchema = zod_1.z.object({
    id: zod_1.z.string(),
    landlordOpenId: zod_1.z.string(),
    assetId: zod_1.z.string(),
    roomId: zod_1.z.string().nullable(),
    leaseId: zod_1.z.string().nullable(),
    tenantId: zod_1.z.string().nullable(),
    repairRecordId: zod_1.z.string().nullable(),
    expenseType: exports.ownerExpenseTypeSchema,
    amount: zod_1.z.number().nonnegative().nullable(),
    note: zod_1.z.string().default(''),
    occurredAt: dateStringSchema,
    monthKey: zod_1.z.string().regex(/^\d{4}-\d{2}$/),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string()
});
exports.ownerExpenseInputSchema = zod_1.z
    .object({
    assetId: zod_1.z.string().optional(),
    roomId: zod_1.z.string().optional(),
    expenseType: exports.ownerExpenseTypeSchema,
    amount: zod_1.z.number().nonnegative().nullable().optional(),
    note: zod_1.z.string().optional(),
    occurredAt: dateStringSchema.optional(),
    repairCategory: zod_1.z.enum(['plumbing', 'electrical', 'appliance', 'structure', 'safety', 'other']).optional()
})
    .refine((value) => Boolean(value.assetId || value.roomId), {
    message: 'assetId or roomId is required'
});
