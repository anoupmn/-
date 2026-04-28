import { z } from 'zod';

export const receiptItemSchema = z.object({
  billId: z.string(),
  type: z.string(),
  feeNature: z.string(),
  itemLabel: z.string(),
  dueDate: z.string(),
  amount: z.number().nonnegative(),
  receivedAt: z.string(),
  receivedAmount: z.number().nonnegative(),
  note: z.string().default(''),
  meterReading: z
    .object({
      previousReading: z.number().nonnegative(),
      currentReading: z.number().nonnegative(),
      usage: z.number().nonnegative(),
      unitPrice: z.number().nonnegative()
    })
    .optional()
});
export type ReceiptItem = z.infer<typeof receiptItemSchema>;

export const receiptSchema = z.object({
  id: z.string(),
  receiptNo: z.string(),
  landlordOpenId: z.string(),
  leaseId: z.string(),
  roomId: z.string(),
  tenantId: z.string(),
  assetId: z.string(),
  billIds: z.array(z.string()),
  title: z.literal('收款收据（非发票）'),
  assetName: z.string(),
  roomName: z.string(),
  tenantName: z.string(),
  items: z.array(receiptItemSchema),
  totalAmount: z.number().nonnegative(),
  receivedAt: z.string(),
  note: z.string().default(''),
  status: z.enum(['active', 'voided']).default('active'),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type Receipt = z.infer<typeof receiptSchema>;
