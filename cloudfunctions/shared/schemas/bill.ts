import { z } from 'zod';

import { BILL_STATUSES } from '../constants/statuses';

export const billTypeSchema = z.enum(['rent', 'deposit', 'water', 'electricity', 'property', 'misc', 'custom']);
export type BillType = z.infer<typeof billTypeSchema>;

export const billSectionSchema = z.enum(['rent', 'deposit', 'non_rent']);
export type BillSection = z.infer<typeof billSectionSchema>;

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
  createdAt: z.string(),
  updatedAt: z.string()
});

export type Bill = z.infer<typeof billSchema>;
