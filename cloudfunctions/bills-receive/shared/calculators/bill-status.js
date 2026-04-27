"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUpcomingDueWindowDays = getUpcomingDueWindowDays;
exports.isBillOverdueTrackable = isBillOverdueTrackable;
exports.deriveBillStatus = deriveBillStatus;
exports.isBillWithinUpcomingWindow = isBillWithinUpcomingWindow;
const dayjs_1 = __importDefault(require("dayjs"));
const statuses_1 = require("../constants/statuses");
const UPCOMING_DUE_WINDOW_DAYS = 15;
function getUpcomingDueWindowDays() {
    return UPCOMING_DUE_WINDOW_DAYS;
}
function isBillOverdueTrackable(bill) {
    return ((bill.responsibility ?? 'tenant') === 'tenant' &&
        !bill.isDepositLike &&
        bill.feeNature !== 'deposit' &&
        bill.type !== 'deposit' &&
        bill.type !== 'fire_deposit' &&
        bill.type !== 'lock_card_deposit');
}
function deriveBillStatus(bill, now) {
    if (bill.receivedAt && bill.receivedAmount !== null) {
        return statuses_1.BILL_STATUSES.paid;
    }
    const today = (0, dayjs_1.default)(now);
    const dueDate = (0, dayjs_1.default)(bill.dueDate);
    if (dueDate.isSame(today, 'day')) {
        return statuses_1.BILL_STATUSES.dueToday;
    }
    if (isBillOverdueTrackable(bill) && dueDate.isBefore(today, 'day')) {
        return statuses_1.BILL_STATUSES.overdue;
    }
    return statuses_1.BILL_STATUSES.pending;
}
function isBillWithinUpcomingWindow(bill, now) {
    if (deriveBillStatus(bill, now) === statuses_1.BILL_STATUSES.paid) {
        return false;
    }
    if (!isBillOverdueTrackable(bill)) {
        return false;
    }
    const today = (0, dayjs_1.default)(now);
    const dueDate = (0, dayjs_1.default)(bill.dueDate);
    const diffDays = dueDate.diff(today, 'day');
    return diffDays >= 0 && diffDays <= getUpcomingDueWindowDays();
}
