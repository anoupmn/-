import dayjs from 'dayjs';

import {
  BILL_RISK_TAG_LABELS,
  BILL_RISK_TAGS,
  BILL_STATUSES,
  LEASE_STATUSES,
  UNIT_MAIN_STATUS_LABELS,
  UNIT_MAIN_STATUSES,
  type BillRiskTag,
  type UnitMainStatus
} from '../constants/statuses';
import { deriveBillStatus, isBillWithinUpcomingWindow } from './bill-status';
import { deriveLeaseStatus, getNextReceivableDate } from './lease-lifecycle';
import type { Asset } from '../schemas/asset';
import type { Bill } from '../schemas/bill';
import { getLeaseFeeRules } from '../schemas/lease';
import type { Lease } from '../schemas/lease';
import type { Room } from '../schemas/room';
import type { Tenant } from '../schemas/tenant';

export interface RentableUnitSummary {
  roomId: string;
  assetId: string;
  displayName: string;
  currentStatus: string;
  mainStatus: UnitMainStatus;
  mainStatusLabel: string;
  currentTenantName: string;
  nextReceivableDate: string;
  nextReceivableAmount: number;
  hasAbnormal: boolean;
  riskTags: BillRiskTag[];
  riskTagLabels: string[];
  summaryHint: string;
  overdueDays: number;
  vacancyDays: number;
}

function resolveLeaseActualEndDate(lease: Pick<Lease, 'endDate' | 'closedAt'>) {
  const closedDate = String(lease.closedAt || '').slice(0, 10);
  if (closedDate && closedDate < lease.endDate) {
    return closedDate;
  }

  return lease.endDate;
}

export function buildRentableUnitSummary(input: {
  asset: Asset;
  room: Room;
  leases: Lease[];
  tenants: Tenant[];
  bills?: Bill[];
  now: string;
}): RentableUnitSummary {
  const { asset, room, leases, tenants, bills = [], now } = input;
  const roomLeases = leases.filter((lease) => lease.roomId === room.id);
  const activeLease = roomLeases.find((lease) => deriveLeaseStatus(lease, now) === LEASE_STATUSES.active) ?? null;
  const futureLease =
    roomLeases
      .filter((lease) => deriveLeaseStatus(lease, now) === LEASE_STATUSES.future)
      .sort((a, b) => dayjs(a.startDate).valueOf() - dayjs(b.startDate).valueOf())[0] ?? null;

  const tenant = activeLease
    ? tenants.find((item) => item.id === activeLease.tenantId) ?? null
    : null;

  let mainStatus: UnitMainStatus = UNIT_MAIN_STATUSES.vacant;
  let nextReceivableDate = '';
  let nextReceivableAmount = 0;
  let overdueDays = 0;
  let vacancyDays = 0;
  const riskTags: BillRiskTag[] = [];

  const activeLeaseBills = activeLease
    ? bills.filter((bill) => bill.leaseId === activeLease.id)
    : [];
  const outstandingBills = activeLeaseBills
    .map((bill) => ({
      ...bill,
      status: deriveBillStatus(bill, now)
    }))
    .filter((bill) => bill.status !== BILL_STATUSES.paid)
    .sort((a, b) => dayjs(a.dueDate).valueOf() - dayjs(b.dueDate).valueOf());

  if (activeLease) {
    mainStatus = UNIT_MAIN_STATUSES.occupied;

    if (outstandingBills[0]) {
      nextReceivableDate = outstandingBills[0].dueDate;
      nextReceivableAmount = outstandingBills[0].amount;
    } else {
      const feeRules = getLeaseFeeRules(activeLease);
      nextReceivableDate = getNextReceivableDate(activeLease, now);
      nextReceivableAmount = feeRules.rent.amount;
    }

    if (
      dayjs(activeLease.endDate).diff(dayjs(now), 'day') <= 15 ||
      outstandingBills.some((bill) => isBillWithinUpcomingWindow(bill, now))
    ) {
      riskTags.push(BILL_RISK_TAGS.expiring);
    }

    const earliestOverdueBill = outstandingBills.find((bill) => bill.status === BILL_STATUSES.overdue);
    if (earliestOverdueBill) {
      riskTags.push(BILL_RISK_TAGS.overdue, BILL_RISK_TAGS.abnormal);
      overdueDays = dayjs(now).diff(dayjs(earliestOverdueBill.dueDate), 'day');
    }
  } else if (futureLease) {
    mainStatus = UNIT_MAIN_STATUSES.pendingMoveIn;
  } else {
    const endedLease =
      roomLeases
        .filter((lease) => deriveLeaseStatus(lease, now) === LEASE_STATUSES.ended)
        .sort((a, b) => dayjs(resolveLeaseActualEndDate(b)).valueOf() - dayjs(resolveLeaseActualEndDate(a)).valueOf())[0] ?? null;

    if (endedLease) {
      vacancyDays = dayjs(now).diff(dayjs(resolveLeaseActualEndDate(endedLease)), 'day');
    }
  }

  let summaryHint = '';
  if (riskTags.includes(BILL_RISK_TAGS.overdue)) {
    summaryHint = `已逾期 ${overdueDays} 天`;
  } else if (outstandingBills.some((bill) => isBillWithinUpcomingWindow(bill, now))) {
    summaryHint = '15 天内有账单到期';
  } else if (mainStatus === UNIT_MAIN_STATUSES.vacant && vacancyDays > 0) {
    summaryHint = `已空置 ${vacancyDays} 天`;
  }

  return {
    roomId: room.id,
    assetId: asset.id,
    displayName: room.isWholeUnitDefault ? asset.name : `${asset.name} · ${room.name}`,
    currentStatus: mainStatus,
    mainStatus,
    mainStatusLabel: UNIT_MAIN_STATUS_LABELS[mainStatus],
    currentTenantName: tenant?.name ?? '',
    nextReceivableDate,
    nextReceivableAmount,
    hasAbnormal: riskTags.includes(BILL_RISK_TAGS.abnormal),
    riskTags,
    riskTagLabels: riskTags.map((tag) => BILL_RISK_TAG_LABELS[tag]),
    summaryHint,
    overdueDays,
    vacancyDays
  };
}
