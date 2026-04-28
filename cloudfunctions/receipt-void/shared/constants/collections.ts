export const COLLECTIONS = {
  landlordUsers: 'landlord_users',
  assets: 'assets',
  rooms: 'rooms',
  tenants: 'tenants',
  leases: 'leases',
  bills: 'bills',
  repairRecords: 'repair_records',
  ownerExpenses: 'owner_expenses',
  receipts: 'receipts',
  reportExports: 'report_exports',
  alerts: 'alerts',
  abnormalFlags: 'abnormal_flags',
  notificationPreferences: 'notification_preferences'
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
