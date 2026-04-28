import { z } from 'zod';

import { RENTAL_MODES } from '../constants/statuses';

export const assetSchema = z.object({
  id: z.string(),
  landlordOpenId: z.string(),
  name: z.string().min(1),
  rentalMode: z.enum(RENTAL_MODES),
  address: z.string().optional().default(''),
  note: z.string().optional().default(''),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type Asset = z.infer<typeof assetSchema>;

export const assetInputSchema = assetSchema.omit({
  id: true,
  landlordOpenId: true,
  createdAt: true,
  updatedAt: true
});

export type AssetInput = z.infer<typeof assetInputSchema>;
