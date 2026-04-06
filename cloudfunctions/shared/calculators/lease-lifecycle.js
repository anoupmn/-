"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveLeaseStatus = deriveLeaseStatus;
exports.assertSingleActiveLease = assertSingleActiveLease;
exports.closeLeaseAndDeriveUnitStatus = closeLeaseAndDeriveUnitStatus;
exports.getNextReceivableDate = getNextReceivableDate;
const dayjs_1 = __importDefault(require("dayjs"));
const statuses_1 = require("../constants/statuses");
function deriveLeaseStatus(lease, now) {
    const today = (0, dayjs_1.default)(now);
    if (lease.closedAt) {
        return statuses_1.LEASE_STATUSES.ended;
    }
    if (today.isBefore((0, dayjs_1.default)(lease.startDate), 'day')) {
        return statuses_1.LEASE_STATUSES.future;
    }
    if (today.isAfter((0, dayjs_1.default)(lease.endDate), 'day')) {
        return statuses_1.LEASE_STATUSES.ended;
    }
    return statuses_1.LEASE_STATUSES.active;
}
function assertSingleActiveLease(leases, nextLease, now) {
    const activeLeases = leases.filter((lease) => lease.roomId === nextLease.roomId && deriveLeaseStatus(lease, now) === statuses_1.LEASE_STATUSES.active);
    const nextStatus = deriveLeaseStatus(nextLease, now);
    if (nextStatus === statuses_1.LEASE_STATUSES.active && activeLeases.length > 0) {
        throw new Error('A room can only have one active lease at a time.');
    }
}
function closeLeaseAndDeriveUnitStatus(lease, relatedLeases, now) {
    const upcomingLease = relatedLeases
        .filter((item) => item.id !== lease.id && deriveLeaseStatus(item, now) === statuses_1.LEASE_STATUSES.future)
        .sort((a, b) => (0, dayjs_1.default)(a.startDate).valueOf() - (0, dayjs_1.default)(b.startDate).valueOf())[0];
    return {
        closedLease: {
            ...lease,
            closedAt: now,
            updatedAt: now
        },
        currentStatus: upcomingLease ? statuses_1.UNIT_STATUSES.pendingMoveIn : statuses_1.UNIT_STATUSES.vacant
    };
}
function getNextReceivableDate(lease, now) {
    let nextDate = (0, dayjs_1.default)(lease.startDate);
    const endDate = (0, dayjs_1.default)(lease.endDate);
    const today = (0, dayjs_1.default)(now);
    while (nextDate.isBefore(today, 'day') && nextDate.isBefore(endDate, 'day')) {
        nextDate = nextDate.add(lease.billingCycleDays, 'day');
    }
    return nextDate.format('YYYY-MM-DD');
}
