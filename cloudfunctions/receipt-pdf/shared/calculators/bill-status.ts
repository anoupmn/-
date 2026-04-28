import dayjs from 'dayjs';

import { BILL_STATUSES, type BillStatus } from '../constants/statuses';
import type { Bill } from '../schemas/bill';

const UPCOMING_DUE_WINDOW_DAYS = 15;

export function getUpcomingDueWindowDays() {
  return UPCOMING_DUE_WINDOW_DAYS;
}

type BillTrackabilityInput = Pick<Bill, 'type'> &
  Partial<Pick<Bill, 'feeNature' | 'responsibility' | 'isDepositLike'>>;

export function isBillOverdueTrackable(bill: BillTrackabilityInput) {
  return (
    (bill.responsibility ?? 'tenant') === 'tenant' &&
    !bill.isDepositLike &&
    bill.feeNature !== 'deposit' &&
    bill.type !== 'deposit' &&
    bill.type !== 'fire_deposit' &&
    bill.type !== 'lock_card_deposit'
  );
}

export function deriveBillStatus(
  bill: Pick<Bill, 'type' | 'dueDate' | 'receivedAt' | 'receivedAmount'> &
    Partial<Pick<Bill, 'feeNature' | 'responsibility' | 'isDepositLike'>>,
  now: string
): BillStatus {
  if (bill.receivedAt && bill.receivedAmount !== null) {
    return BILL_STATUSES.paid;
  }

  const today = dayjs(now);
  const dueDate = dayjs(bill.dueDate);

  if (dueDate.isSame(today, 'day')) {
    return BILL_STATUSES.dueToday;
  }

  if (isBillOverdueTrackable(bill) && dueDate.isBefore(today, 'day')) {
    return BILL_STATUSES.overdue;
  }

  return BILL_STATUSES.pending;
}

export function isBillWithinUpcomingWindow(
  bill: Pick<Bill, 'dueDate' | 'type' | 'receivedAt' | 'receivedAmount'> &
    Partial<Pick<Bill, 'feeNature' | 'responsibility' | 'isDepositLike'>>,
  now: string
) {
  if (deriveBillStatus(bill, now) === BILL_STATUSES.paid) {
    return false;
  }

  if (!isBillOverdueTrackable(bill)) {
    return false;
  }

  const today = dayjs(now);
  const dueDate = dayjs(bill.dueDate);
  const diffDays = dueDate.diff(today, 'day');

  return diffDays >= 0 && diffDays <= getUpcomingDueWindowDays();
}
