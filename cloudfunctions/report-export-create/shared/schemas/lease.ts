import { z } from 'zod';

export const leaseFeeCadenceSchema = z.enum(['cycle', 'once']);
export type LeaseFeeCadence = z.infer<typeof leaseFeeCadenceSchema>;

export const customFeeNatureSchema = z.enum(['recurring', 'one_time', 'deposit']);
export type CustomFeeNature = z.infer<typeof customFeeNatureSchema>;

export const leaseFeeRuleSchema = z.object({
  amount: z.number().nonnegative(),
  cadence: leaseFeeCadenceSchema.default('cycle')
});
export type LeaseFeeRule = z.infer<typeof leaseFeeRuleSchema>;

export const customFeeItemSchema = z.object({
  key: z.string(),
  label: z.string(),
  amount: z.number().nonnegative(),
  cadence: leaseFeeCadenceSchema,
  feeNature: customFeeNatureSchema.default('recurring')
});
export type CustomFeeItem = z.infer<typeof customFeeItemSchema>;

const zeroCycleFeeRule = leaseFeeRuleSchema.default({
  amount: 0,
  cadence: 'cycle'
});

const zeroOnceFeeRule = leaseFeeRuleSchema.default({
  amount: 0,
  cadence: 'once'
});

export const leaseFeeRulesSchema = z.object({
  rent: leaseFeeRuleSchema,
  deposit: leaseFeeRuleSchema,
  management: zeroCycleFeeRule,
  fireDeposit: zeroOnceFeeRule,
  lockCardDeposit: zeroOnceFeeRule,
  water: leaseFeeRuleSchema.optional(),
  electricity: leaseFeeRuleSchema.optional(),
  property: leaseFeeRuleSchema.optional(),
  misc: leaseFeeRuleSchema.optional(),
  customFeeItems: z.array(customFeeItemSchema).default([])
});
export type LeaseFeeRules = z.infer<typeof leaseFeeRulesSchema>;
export type LeaseFeeRulesInput = z.input<typeof leaseFeeRulesSchema>;

export const leaseSchema = z.object({
  id: z.string(),
  landlordOpenId: z.string(),
  roomId: z.string(),
  tenantId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  billingCycleDays: z.number().int().positive(),
  rentAmount: z.number().nonnegative(),
  depositAmount: z.number().nonnegative(),
  feeRules: leaseFeeRulesSchema.optional(),
  note: z.string().optional().default(''),
  renewalFromLeaseId: z.string().optional(),
  renewedToLeaseId: z.string().optional(),
  renewedAt: z.string().optional(),
  renewalEndDate: z.string().optional(),
  closedAt: z.string().nullable().optional().default(null),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type Lease = z.infer<typeof leaseSchema>;

export const leaseInputSchema = leaseSchema.omit({
  id: true,
  landlordOpenId: true,
  closedAt: true,
  createdAt: true,
  updatedAt: true
});

export type LeaseInput = z.input<typeof leaseInputSchema>;

export function buildDefaultLeaseFeeRules(input: Pick<Lease, 'rentAmount' | 'depositAmount'>): LeaseFeeRules {
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

export function getLeaseFeeRules(
  lease: Pick<Lease, 'rentAmount' | 'depositAmount'> & {
    feeRules?: LeaseFeeRulesInput | LeaseFeeRules;
  }
): LeaseFeeRules {
  const normalized = lease.feeRules ?? buildDefaultLeaseFeeRules(lease);
  return leaseFeeRulesSchema.parse({
    ...normalized,
    management: normalized.management ?? normalized.property ?? { amount: 0, cadence: 'cycle' },
    fireDeposit: normalized.fireDeposit ?? { amount: 0, cadence: 'once' },
    lockCardDeposit: normalized.lockCardDeposit ?? { amount: 0, cadence: 'once' },
    customFeeItems: normalized.customFeeItems ?? []
  });
}
