import { z } from 'zod';

export const tenantSchema = z.object({
  id: z.string(),
  landlordOpenId: z.string(),
  name: z.string().min(1),
  phone: z.string().optional().default(''),
  note: z.string().optional().default(''),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type Tenant = z.infer<typeof tenantSchema>;

export const tenantInputSchema = tenantSchema.omit({
  id: true,
  landlordOpenId: true,
  createdAt: true,
  updatedAt: true
});

export type TenantInput = z.infer<typeof tenantInputSchema>;
