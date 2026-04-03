import { z } from 'zod';

export const leaseFeeCadenceSchema = z.enum(['cycle', 'once']);
export type LeaseFeeCadence = z.infer<typeof leaseFeeCadenceSchema>;

export const leaseFeeRuleSchema = z.object({
  amount: z.number().nonnegative(),
  cadence: leaseFeeCadenceSchema
});
export type LeaseFeeRule = z.infer<typeof leaseFeeRuleSchema>;

export const customFeeItemSchema = z.object({
  key: z.string(),
  label: z.string(),
  amount: z.number().nonnegative(),
  cadence: leaseFeeCadenceSchema
});
export type CustomFeeItem = z.infer<typeof customFeeItemSchema>;

export const leaseFeeRulesSchema = z.object({
  rent: leaseFeeRuleSchema,
  deposit: leaseFeeRuleSchema,
  water: leaseFeeRuleSchema.optional(),
  electricity: leaseFeeRuleSchema.optional(),
  property: leaseFeeRuleSchema.optional(),
  misc: leaseFeeRuleSchema.optional(),
  customFeeItems: z.array(customFeeItemSchema).default([])
});
export type LeaseFeeRules = z.infer<typeof leaseFeeRulesSchema>;

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

export type LeaseInput = z.infer<typeof leaseInputSchema>;

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
    customFeeItems: []
  };
}

export function getLeaseFeeRules(lease: Pick<Lease, 'rentAmount' | 'depositAmount' | 'feeRules'>): LeaseFeeRules {
  const normalized = lease.feeRules ?? buildDefaultLeaseFeeRules(lease);
  return leaseFeeRulesSchema.parse({
    ...normalized,
    customFeeItems: normalized.customFeeItems ?? []
  });
}
