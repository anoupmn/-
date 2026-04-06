"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALERT_TYPE_LABELS = exports.ALERT_LEVELS = exports.ALERT_TYPES = exports.BILL_RISK_TAG_LABELS = exports.BILL_RISK_TAGS = exports.BILL_STATUSES = exports.UNIT_MAIN_STATUS_LABELS = exports.UNIT_MAIN_STATUSES = exports.UNIT_STATUSES = exports.LEASE_STATUSES = exports.RENTAL_MODES = void 0;
exports.RENTAL_MODES = ['whole', 'room'];
exports.LEASE_STATUSES = {
    future: 'future',
    active: 'active',
    ended: 'ended'
};
exports.UNIT_STATUSES = {
    occupied: 'occupied',
    pendingMoveIn: 'pending_move_in',
    vacant: 'vacant',
    overdue: 'overdue'
};
exports.UNIT_MAIN_STATUSES = {
    occupied: exports.UNIT_STATUSES.occupied,
    pendingMoveIn: exports.UNIT_STATUSES.pendingMoveIn,
    vacant: exports.UNIT_STATUSES.vacant
};
exports.UNIT_MAIN_STATUS_LABELS = {
    [exports.UNIT_MAIN_STATUSES.occupied]: '已出租',
    [exports.UNIT_MAIN_STATUSES.pendingMoveIn]: '待入住',
    [exports.UNIT_MAIN_STATUSES.vacant]: '空置'
};
exports.BILL_STATUSES = {
    pending: 'pending',
    dueToday: 'due_today',
    paid: 'paid',
    overdue: 'overdue'
};
exports.BILL_RISK_TAGS = {
    expiring: 'expiring',
    overdue: 'overdue',
    abnormal: 'abnormal'
};
exports.BILL_RISK_TAG_LABELS = {
    [exports.BILL_RISK_TAGS.expiring]: '即将到期',
    [exports.BILL_RISK_TAGS.overdue]: '已逾期',
    [exports.BILL_RISK_TAGS.abnormal]: '异常'
};
exports.ALERT_TYPES = {
    expiring: 'expiring',
    overdue: 'overdue',
    vacancyLong: 'vacancy_long',
    manualAbnormal: 'manual_abnormal'
};
exports.ALERT_LEVELS = {
    info: 'info',
    warning: 'warning',
    danger: 'danger'
};
exports.ALERT_TYPE_LABELS = {
    [exports.ALERT_TYPES.expiring]: '即将到期',
    [exports.ALERT_TYPES.overdue]: '已逾期',
    [exports.ALERT_TYPES.vacancyLong]: '空置过久',
    [exports.ALERT_TYPES.manualAbnormal]: '人工异常'
};
