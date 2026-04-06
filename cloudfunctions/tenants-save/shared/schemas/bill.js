"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billSchema = exports.billSectionSchema = exports.billTypeSchema = void 0;
const zod_1 = require("zod");
const statuses_1 = require("../constants/statuses");
exports.billTypeSchema = zod_1.z.enum(['rent', 'deposit', 'water', 'electricity', 'property', 'misc', 'custom']);
exports.billSectionSchema = zod_1.z.enum(['rent', 'deposit', 'non_rent']);
exports.billSchema = zod_1.z.object({
    id: zod_1.z.string(),
    landlordOpenId: zod_1.z.string(),
    leaseId: zod_1.z.string(),
    roomId: zod_1.z.string(),
    type: exports.billTypeSchema,
    section: exports.billSectionSchema,
    dueDate: zod_1.z.string(),
    amount: zod_1.z.number().nonnegative(),
    status: zod_1.z.enum([statuses_1.BILL_STATUSES.pending, statuses_1.BILL_STATUSES.dueToday, statuses_1.BILL_STATUSES.paid, statuses_1.BILL_STATUSES.overdue]),
    receivedAt: zod_1.z.string().nullable(),
    receivedAmount: zod_1.z.number().nonnegative().nullable(),
    note: zod_1.z.string().optional(),
    itemKey: zod_1.z.string().optional(),
    itemLabel: zod_1.z.string().optional(),
    source: zod_1.z.enum(['system', 'manual']).optional(),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string()
});
