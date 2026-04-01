export const RENTAL_MODES = ['whole', 'room'] as const;
export type RentalMode = (typeof RENTAL_MODES)[number];

export const LEASE_STATUSES = {
  future: 'future',
  active: 'active',
  ended: 'ended'
} as const;
export type LeaseStatus = (typeof LEASE_STATUSES)[keyof typeof LEASE_STATUSES];

export const UNIT_STATUSES = {
  occupied: 'occupied',
  pendingMoveIn: 'pending_move_in',
  vacant: 'vacant',
  overdue: 'overdue'
} as const;
export type UnitStatus = (typeof UNIT_STATUSES)[keyof typeof UNIT_STATUSES];
