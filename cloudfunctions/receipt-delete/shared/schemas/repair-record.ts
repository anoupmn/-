import { z } from 'zod';

import { REPAIR_CATEGORIES } from '../constants/repairs';

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const repairRecordSchema = z.object({
  id: z.string(),
  landlordOpenId: z.string(),
  assetId: z.string(),
  roomId: z.string().nullable(),
  leaseId: z.string().nullable(),
  tenantId: z.string().nullable(),
  category: z.enum([
    REPAIR_CATEGORIES.plumbing,
    REPAIR_CATEGORIES.electrical,
    REPAIR_CATEGORIES.appliance,
    REPAIR_CATEGORIES.structure,
    REPAIR_CATEGORIES.safety,
    REPAIR_CATEGORIES.other
  ]),
  note: z.string().trim().min(1),
  occurredAt: dateStringSchema,
  createdAt: z.string(),
  updatedAt: z.string()
});

export type RepairRecord = z.infer<typeof repairRecordSchema>;

export const repairRecordInputSchema = z
  .object({
    assetId: z.string().optional(),
    roomId: z.string().optional(),
    category: repairRecordSchema.shape.category,
    note: z.string().trim().min(1),
    occurredAt: dateStringSchema.optional()
  })
  .refine((value) => Boolean(value.assetId || value.roomId), {
    message: 'assetId or roomId is required'
  });

export type RepairRecordInput = z.infer<typeof repairRecordInputSchema>;
