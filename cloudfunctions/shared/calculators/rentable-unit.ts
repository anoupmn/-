import dayjs from 'dayjs';

import { LEASE_STATUSES, UNIT_STATUSES, type UnitStatus } from '../constants/statuses';
import { deriveLeaseStatus, getNextReceivableDate } from './lease-lifecycle';
import type { Asset } from '../schemas/asset';
import type { Lease } from '../schemas/lease';
import type { Room } from '../schemas/room';
import type { Tenant } from '../schemas/tenant';

export interface RentableUnitSummary {
  roomId: string;
  assetId: string;
  displayName: string;
  currentStatus: string;
  currentTenantName: string;
  nextReceivableDate: string;
  nextReceivableAmount: number;
  hasAbnormal: boolean;
  overdueDays: number;
  vacancyDays: number;
}

export function buildRentableUnitSummary(input: {
  asset: Asset;
  room: Room;
  leases: Lease[];
  tenants: Tenant[];
  now: string;
}): RentableUnitSummary {
  const { asset, room, leases, tenants, now } = input;
  const roomLeases = leases.filter((lease) => lease.roomId === room.id);
  const activeLease = roomLeases.find((lease) => deriveLeaseStatus(lease, now) === LEASE_STATUSES.active) ?? null;
  const futureLease =
    roomLeases
      .filter((lease) => deriveLeaseStatus(lease, now) === LEASE_STATUSES.future)
      .sort((a, b) => dayjs(a.startDate).valueOf() - dayjs(b.startDate).valueOf())[0] ?? null;

  const tenant = activeLease
    ? tenants.find((item) => item.id === activeLease.tenantId) ?? null
    : null;

  let currentStatus: UnitStatus = UNIT_STATUSES.vacant;
  let nextReceivableDate = '';
  let nextReceivableAmount = 0;
  let overdueDays = 0;
  let vacancyDays = 0;

  if (activeLease) {
    nextReceivableDate = getNextReceivableDate(activeLease, now);
    nextReceivableAmount = activeLease.rentAmount;
    const dueDate = dayjs(nextReceivableDate);
    const today = dayjs(now);

    if (dueDate.isBefore(today, 'day')) {
      currentStatus = UNIT_STATUSES.overdue;
      overdueDays = today.diff(dueDate, 'day');
    } else {
      currentStatus = UNIT_STATUSES.occupied;
    }
  } else if (futureLease) {
    currentStatus = UNIT_STATUSES.pendingMoveIn;
  } else {
    const endedLease =
      roomLeases
        .filter((lease) => deriveLeaseStatus(lease, now) === LEASE_STATUSES.ended)
        .sort((a, b) => dayjs(b.endDate).valueOf() - dayjs(a.endDate).valueOf())[0] ?? null;

    if (endedLease) {
      vacancyDays = dayjs(now).diff(dayjs(endedLease.endDate), 'day');
    }
  }

  return {
    roomId: room.id,
    assetId: asset.id,
    displayName: room.isWholeUnitDefault ? asset.name : `${asset.name} · ${room.name}`,
    currentStatus,
    currentTenantName: tenant?.name ?? '',
    nextReceivableDate,
    nextReceivableAmount,
    hasAbnormal: currentStatus === UNIT_STATUSES.overdue,
    overdueDays,
    vacancyDays
  };
}
