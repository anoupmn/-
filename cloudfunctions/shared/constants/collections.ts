export const COLLECTIONS = {
  landlordUsers: 'landlord_users',
  assets: 'assets',
  rooms: 'rooms',
  tenants: 'tenants',
  leases: 'leases',
  bills: 'bills'
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
