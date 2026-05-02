import { z } from 'zod';

import { BILL_STATUSES } from '../constants/statuses';

export const billTypeSchema = z.enum([
  'rent',
  'deposit',
  'management',
  'fire_deposit',
  'lock_card_deposit',
  'water',
  'electricity',
  'property',
  'misc',
  'custom',
  'rent_refund',
  'deposit_refund'
]);
export type BillType = z.infer<typeof billTypeSchema>;

export const billSectionSchema = z.enum(['rent', 'deposit', 'non_rent']);
export type BillSection = z.infer<typeof billSectionSchema>;

export const billFeeNatureSchema = z.enum(['recurring', 'one_time', 'deposit']);
export type BillFeeNature = z.infer<typeof billFeeNatureSchema>;

export const billCadenceSchema = z.enum(['cycle', 'once']);
export type BillCadence = z.infer<typeof billCadenceSchema>;

export const meterReadingSchema = z.object({
  previousReading: z.number().nonnegative(),
  currentReading: z.number().nonnegative(),
  usage: z.number().nonnegative(),
  unitPrice: z.number().nonnegative()
});
export type MeterReading = z.infer<typeof meterReadingSchema>;

export const billSchema = z.object({
  id: z.string(),
  landlordOpenId: z.string(),
  leaseId: z.string(),
  roomId: z.string(),
  type: billTypeSchema,
  section: billSectionSchema,
  dueDate: z.string(),
  amount: z.number().nonnegative(),
  status: z.enum([BILL_STATUSES.pending, BILL_STATUSES.dueToday, BILL_STATUSES.paid, BILL_STATUSES.overdue]),
  receivedAt: z.string().nullable(),
  receivedAmount: z.number().nonnegative().nullable(),
  note: z.string().optional(),
  itemKey: z.string().optional(),
  itemLabel: z.string().optional(),
  source: z.enum(['system', 'manual']).optional(),
  meterReading: meterReadingSchema.optional(),
  feeNature: billFeeNatureSchema.catch('recurring').default('recurring'),
  responsibility: z.enum(['tenant', 'landlord']).catch('tenant').default('tenant'),
  cadence: billCadenceSchema.catch('cycle').default('cycle'),
  isDepositLike: z.boolean().catch(false).default(false),
  isOneTime: z.boolean().catch(false).default(false),
  legacy: z.boolean().catch(false).default(false),
  receiptId: z.string().optional(),
  receiptNo: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type Bill = z.input<typeof billSchema>;
