"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaseInputSchema = exports.leaseSchema = exports.leaseFeeRulesSchema = exports.customFeeItemSchema = exports.leaseFeeRuleSchema = exports.customFeeNatureSchema = exports.leaseFeeCadenceSchema = void 0;
exports.buildDefaultLeaseFeeRules = buildDefaultLeaseFeeRules;
exports.getLeaseFeeRules = getLeaseFeeRules;
const zod_1 = require("zod");
exports.leaseFeeCadenceSchema = zod_1.z.enum(['cycle', 'once']);
exports.customFeeNatureSchema = zod_1.z.enum(['recurring', 'one_time', 'deposit']);
exports.leaseFeeRuleSchema = zod_1.z.object({
    amount: zod_1.z.number().nonnegative(),
    cadence: exports.leaseFeeCadenceSchema.default('cycle')
});
exports.customFeeItemSchema = zod_1.z.object({
    key: zod_1.z.string(),
    label: zod_1.z.string(),
    amount: zod_1.z.number().nonnegative(),
    cadence: exports.leaseFeeCadenceSchema,
    feeNature: exports.customFeeNatureSchema.default('recurring')
});
const zeroCycleFeeRule = exports.leaseFeeRuleSchema.default({
    amount: 0,
    cadence: 'cycle'
});
const zeroOnceFeeRule = exports.leaseFeeRuleSchema.default({
    amount: 0,
    cadence: 'once'
});
exports.leaseFeeRulesSchema = zod_1.z.object({
    rent: exports.leaseFeeRuleSchema,
    deposit: exports.leaseFeeRuleSchema,
    management: zeroCycleFeeRule,
    fireDeposit: zeroOnceFeeRule,
    lockCardDeposit: zeroOnceFeeRule,
    water: exports.leaseFeeRuleSchema.optional(),
    electricity: exports.leaseFeeRuleSchema.optional(),
    property: exports.leaseFeeRuleSchema.optional(),
    misc: exports.leaseFeeRuleSchema.optional(),
    customFeeItems: zod_1.z.array(exports.customFeeItemSchema).default([])
});
exports.leaseSchema = zod_1.z.object({
    id: zod_1.z.string(),
    landlordOpenId: zod_1.z.string(),
    roomId: zod_1.z.string(),
    tenantId: zod_1.z.string(),
    startDate: zod_1.z.string(),
    endDate: zod_1.z.string(),
    billingCycleDays: zod_1.z.number().int().positive(),
    rentAmount: zod_1.z.number().nonnegative(),
    depositAmount: zod_1.z.number().nonnegative(),
    feeRules: exports.leaseFeeRulesSchema.optional(),
    note: zod_1.z.string().optional().default(''),
    renewalFromLeaseId: zod_1.z.string().optional(),
    renewedToLeaseId: zod_1.z.string().optional(),
    renewedAt: zod_1.z.string().optional(),
    renewalEndDate: zod_1.z.string().optional(),
    closedAt: zod_1.z.string().nullable().optional().default(null),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string()
});
exports.leaseInputSchema = exports.leaseSchema.omit({
    id: true,
    landlordOpenId: true,
    closedAt: true,
    createdAt: true,
    updatedAt: true
});
function buildDefaultLeaseFeeRules(input) {
    return {
        rent: {
            amount: input.rentAmount,
            cadence: 'cycle'
        },
        deposit: {
            amount: input.depositAmount,
            cadence: 'once'
        },
        management: {
            amount: 0,
            cadence: 'cycle'
        },
        fireDeposit: {
            amount: 0,
            cadence: 'once'
        },
        lockCardDeposit: {
            amount: 0,
            cadence: 'once'
        },
        customFeeItems: []
    };
}
function getLeaseFeeRules(lease) {
    const normalized = lease.feeRules ?? buildDefaultLeaseFeeRules(lease);
    return exports.leaseFeeRulesSchema.parse({
        ...normalized,
        management: normalized.management ?? normalized.property ?? { amount: 0, cadence: 'cycle' },
        fireDeposit: normalized.fireDeposit ?? { amount: 0, cadence: 'once' },
        lockCardDeposit: normalized.lockCardDeposit ?? { amount: 0, cadence: 'once' },
        customFeeItems: normalized.customFeeItems ?? []
    });
}
