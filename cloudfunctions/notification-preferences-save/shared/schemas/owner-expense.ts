import { z } from 'zod';

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const ownerExpenseTypeSchema = z.enum(['repair', 'cleaning', 'caretaking', 'labor', 'other']);
export type OwnerExpenseType = z.infer<typeof ownerExpenseTypeSchema>;

export const ownerExpenseSchema = z.object({
  id: z.string(),
  landlordOpenId: z.string(),
  assetId: z.string(),
  roomId: z.string().nullable(),
  leaseId: z.string().nullable(),
  tenantId: z.string().nullable(),
  repairRecordId: z.string().nullable(),
  expenseType: ownerExpenseTypeSchema,
  amount: z.number().nonnegative().nullable(),
  note: z.string().default(''),
  occurredAt: dateStringSchema,
  monthKey: z.string().regex(/^\d{4}-\d{2}$/),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type OwnerExpense = z.infer<typeof ownerExpenseSchema>;

export const ownerExpenseInputSchema = z
  .object({
    assetId: z.string().optional(),
    roomId: z.string().optional(),
    expenseType: ownerExpenseTypeSchema,
    amount: z.number().nonnegative().nullable().optional(),
    note: z.string().optional(),
    occurredAt: dateStringSchema.optional(),
    repairCategory: z.enum(['plumbing', 'electrical', 'appliance', 'structure', 'safety', 'other']).optional()
  })
  .refine((value) => Boolean(value.assetId || value.roomId), {
    message: 'assetId or roomId is required'
  });

export type OwnerExpenseInput = z.infer<typeof ownerExpenseInputSchema>;
