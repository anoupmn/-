"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billSchema = exports.billCadenceSchema = exports.billFeeNatureSchema = exports.billSectionSchema = exports.billTypeSchema = void 0;
const zod_1 = require("zod");
const statuses_1 = require("../constants/statuses");
exports.billTypeSchema = zod_1.z.enum([
    'rent',
    'deposit',
    'management',
    'fire_deposit',
    'lock_card_deposit',
    'water',
    'electricity',
    'property',
    'misc',
    'custom'
]);
exports.billSectionSchema = zod_1.z.enum(['rent', 'deposit', 'non_rent']);
exports.billFeeNatureSchema = zod_1.z.enum(['recurring', 'one_time', 'deposit']);
exports.billCadenceSchema = zod_1.z.enum(['cycle', 'once']);
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
    feeNature: exports.billFeeNatureSchema.catch('recurring').default('recurring'),
    responsibility: zod_1.z.literal('tenant').catch('tenant').default('tenant'),
    cadence: exports.billCadenceSchema.catch('cycle').default('cycle'),
    isDepositLike: zod_1.z.boolean().catch(false).default(false),
    isOneTime: zod_1.z.boolean().catch(false).default(false),
    legacy: zod_1.z.boolean().catch(false).default(false),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string()
});
