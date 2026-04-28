import { z } from 'zod';

import { ALERT_TYPES } from '../constants/statuses';

export const notificationPreferenceSchema = z.object({
  id: z.string(),
  landlordOpenId: z.string(),
  consentState: z.enum(['unknown', 'accepted', 'rejected']),
  hasRequested: z.boolean(),
  enabledRuleTypes: z.array(
    z.enum([ALERT_TYPES.expiring, ALERT_TYPES.overdue, ALERT_TYPES.vacancyLong, ALERT_TYPES.manualAbnormal])
  ),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type NotificationPreference = z.infer<typeof notificationPreferenceSchema>;
