import dayjs from 'dayjs';

import { LEASE_STATUSES, UNIT_STATUSES } from '../constants/statuses';
import type { Lease } from '../schemas/lease';

export function deriveLeaseStatus(lease: Pick<Lease, 'startDate' | 'endDate' | 'closedAt'>, now: string) {
  const today = dayjs(now);

  if (lease.closedAt) {
    return LEASE_STATUSES.ended;
  }

  if (today.isBefore(dayjs(lease.startDate), 'day')) {
    return LEASE_STATUSES.future;
  }

  if (today.isAfter(dayjs(lease.endDate), 'day')) {
    return LEASE_STATUSES.ended;
  }

  return LEASE_STATUSES.active;
}

export function assertSingleActiveLease(leases: Lease[], nextLease: Lease, now: string) {
  const nextStart = dayjs(nextLease.startDate);
  const nextEnd = dayjs(nextLease.endDate);
  const overlappedLease = leases.find((lease) => {
    if (lease.id === nextLease.id || lease.roomId !== nextLease.roomId) {
      return false;
    }

    const existingStart = dayjs(lease.startDate);
    const existingEnd = lease.closedAt ? dayjs(lease.closedAt) : dayjs(lease.endDate);

    return !nextEnd.isBefore(existingStart, 'day') && !nextStart.isAfter(existingEnd, 'day');
  });

  if (overlappedLease) {
    throw new Error('A room can only have one active lease at a time. 租约时间冲突：同一房间已有重叠租约。');
  }
}

export function closeLeaseAndDeriveUnitStatus(
  lease: Lease,
  relatedLeases: Lease[],
  now: string
) {
  const upcomingLease = relatedLeases
    .filter((item) => item.id !== lease.id && deriveLeaseStatus(item, now) === LEASE_STATUSES.future)
    .sort((a, b) => dayjs(a.startDate).valueOf() - dayjs(b.startDate).valueOf())[0];

  return {
    closedLease: {
      ...lease,
      closedAt: now,
      updatedAt: now
    },
    currentStatus: upcomingLease ? UNIT_STATUSES.pendingMoveIn : UNIT_STATUSES.vacant
  };
}

export function getNextReceivableDate(lease: Pick<Lease, 'startDate' | 'billingCycleDays' | 'endDate'>, now: string) {
  let nextDate = dayjs(lease.startDate);
  const endDate = dayjs(lease.endDate);
  const today = dayjs(now);

  while (nextDate.isBefore(today, 'day') && nextDate.isBefore(endDate, 'day')) {
    nextDate = nextDate.add(lease.billingCycleDays, 'day');
  }

  return nextDate.format('YYYY-MM-DD');
}
