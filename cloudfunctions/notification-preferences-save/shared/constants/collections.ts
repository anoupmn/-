export const COLLECTIONS = {
  landlordUsers: 'landlord_users',
  assets: 'assets',
  rooms: 'rooms',
  tenants: 'tenants',
  leases: 'leases',
  bills: 'bills',
  alerts: 'alerts',
  abnormalFlags: 'abnormal_flags',
  notificationPreferences: 'notification_preferences'
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
