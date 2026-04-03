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

export const UNIT_MAIN_STATUSES = {
  occupied: UNIT_STATUSES.occupied,
  pendingMoveIn: UNIT_STATUSES.pendingMoveIn,
  vacant: UNIT_STATUSES.vacant
} as const;
export type UnitMainStatus = (typeof UNIT_MAIN_STATUSES)[keyof typeof UNIT_MAIN_STATUSES];

export const UNIT_MAIN_STATUS_LABELS: Record<UnitMainStatus, string> = {
  [UNIT_MAIN_STATUSES.occupied]: '已出租',
  [UNIT_MAIN_STATUSES.pendingMoveIn]: '待入住',
  [UNIT_MAIN_STATUSES.vacant]: '空置'
};

export const BILL_STATUSES = {
  pending: 'pending',
  dueToday: 'due_today',
  paid: 'paid',
  overdue: 'overdue'
} as const;
export type BillStatus = (typeof BILL_STATUSES)[keyof typeof BILL_STATUSES];

export const BILL_RISK_TAGS = {
  expiring: 'expiring',
  overdue: 'overdue',
  abnormal: 'abnormal'
} as const;
export type BillRiskTag = (typeof BILL_RISK_TAGS)[keyof typeof BILL_RISK_TAGS];

export const BILL_RISK_TAG_LABELS: Record<BillRiskTag, string> = {
  [BILL_RISK_TAGS.expiring]: '即将到期',
  [BILL_RISK_TAGS.overdue]: '已逾期',
  [BILL_RISK_TAGS.abnormal]: '异常'
};

export const ALERT_TYPES = {
  expiring: 'expiring',
  overdue: 'overdue',
  vacancyLong: 'vacancy_long',
  manualAbnormal: 'manual_abnormal'
} as const;
export type AlertType = (typeof ALERT_TYPES)[keyof typeof ALERT_TYPES];

export const ALERT_LEVELS = {
  info: 'info',
  warning: 'warning',
  danger: 'danger'
} as const;
export type AlertLevel = (typeof ALERT_LEVELS)[keyof typeof ALERT_LEVELS];

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  [ALERT_TYPES.expiring]: '即将到期',
  [ALERT_TYPES.overdue]: '已逾期',
  [ALERT_TYPES.vacancyLong]: '空置过久',
  [ALERT_TYPES.manualAbnormal]: '人工异常'
};
