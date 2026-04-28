import { z } from 'zod';

import { ALERT_LEVELS, ALERT_TYPES } from '../constants/statuses';

export const alertActionTargetSchema = z.object({
  page: z.enum(['units', 'unit-detail']),
  query: z.record(z.string(), z.string())
});

export const alertSchema = z.object({
  id: z.string(),
  landlordOpenId: z.string(),
  roomId: z.string(),
  assetId: z.string(),
  type: z.enum([ALERT_TYPES.expiring, ALERT_TYPES.overdue, ALERT_TYPES.vacancyLong, ALERT_TYPES.manualAbnormal]),
  level: z.enum([ALERT_LEVELS.info, ALERT_LEVELS.warning, ALERT_LEVELS.danger]),
  title: z.string(),
  summary: z.string(),
  reason: z.string(),
  active: z.boolean(),
  sourceId: z.string().optional(),
  actionTarget: alertActionTargetSchema,
  createdAt: z.string(),
  updatedAt: z.string()
});

export type Alert = z.infer<typeof alertSchema>;
