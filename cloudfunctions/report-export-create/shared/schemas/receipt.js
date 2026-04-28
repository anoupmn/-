"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.receiptSchema = exports.receiptItemSchema = void 0;
const zod_1 = require("zod");
exports.receiptItemSchema = zod_1.z.object({
    billId: zod_1.z.string(),
    type: zod_1.z.string(),
    feeNature: zod_1.z.string(),
    itemLabel: zod_1.z.string(),
    dueDate: zod_1.z.string(),
    amount: zod_1.z.number().nonnegative(),
    receivedAt: zod_1.z.string(),
    receivedAmount: zod_1.z.number().nonnegative(),
    note: zod_1.z.string().default(''),
    meterReading: zod_1.z
        .object({
        previousReading: zod_1.z.number().nonnegative(),
        currentReading: zod_1.z.number().nonnegative(),
        usage: zod_1.z.number().nonnegative(),
        unitPrice: zod_1.z.number().nonnegative()
    })
        .optional()
});
exports.receiptSchema = zod_1.z.object({
    id: zod_1.z.string(),
    receiptNo: zod_1.z.string(),
    landlordOpenId: zod_1.z.string(),
    leaseId: zod_1.z.string(),
    roomId: zod_1.z.string(),
    tenantId: zod_1.z.string(),
    assetId: zod_1.z.string(),
    billIds: zod_1.z.array(zod_1.z.string()),
    title: zod_1.z.literal('收款收据（非发票）'),
    assetName: zod_1.z.string(),
    roomName: zod_1.z.string(),
    tenantName: zod_1.z.string(),
    items: zod_1.z.array(exports.receiptItemSchema),
    totalAmount: zod_1.z.number().nonnegative(),
    receivedAt: zod_1.z.string(),
    collectorName: zod_1.z.string().default(''),
    note: zod_1.z.string().default(''),
    status: zod_1.z.enum(['active', 'voided']).default('active'),
    voidedAt: zod_1.z.string().nullable().default(null),
    voidReason: zod_1.z.string().nullable().default(null),
    reissueFromReceiptId: zod_1.z.string().nullable().default(null),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string()
});
