import { z } from 'zod';

export const abnormalFlagSchema = z.object({
  id: z.string(),
  landlordOpenId: z.string(),
  roomId: z.string(),
  active: z.boolean(),
  reason: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  clearedAt: z.string().nullable()
});

export type AbnormalFlag = z.infer<typeof abnormalFlagSchema>;
