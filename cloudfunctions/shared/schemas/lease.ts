import { z } from 'zod';

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
