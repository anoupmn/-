import { z } from 'zod';

export const roomSchema = z.object({
  id: z.string(),
  landlordOpenId: z.string(),
  assetId: z.string(),
  name: z.string().min(1),
  note: z.string().optional().default(''),
  isWholeUnitDefault: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type Room = z.infer<typeof roomSchema>;

export const roomInputSchema = roomSchema.omit({
  id: true,
  landlordOpenId: true,
  createdAt: true,
  updatedAt: true
});

export type RoomInput = z.infer<typeof roomInputSchema>;
