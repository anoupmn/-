import dayjs from 'dayjs';

import { buildRentableUnitSummary } from '../shared/calculators/rentable-unit';
import { BILL_STATUSES, LEASE_STATUSES } from '../shared/constants/statuses';
import { deriveBillStatus } from '../shared/calculators/bill-status';
import { deriveLeaseStatus } from '../shared/calculators/lease-lifecycle';
import { ensureBillsForLease } from '../shared/repositories/bill-repository';
import { getAllDomainData, type CloudEventBase, resolveDb } from '../shared/runtime';
import type { Bill } from '../shared/schemas/bill';

export interface RentableUnitDetailEvent extends CloudEventBase {
  roomId: string;
}

function getBillTypeLabel(bill: Bill) {
  if (bill.itemLabel) {
    return bill.itemLabel;
  }

  return {
    rent: '租金',
    deposit: '押金',
    water: '水费',
    electricity: '电费',
    property: '管理费',
    misc: '杂费',
    custom: '其他费用'
  }[bill.type];
}

function buildMonthlyBillGroups(bills: Bill[], now: string) {
  const currentMonth = dayjs(now).format('YYYY-MM');
  const monthMap = new Map<
    string,
    {
      monthKey: string;
      monthLabel: string;
      isCurrentMonth: boolean;
      expandedByDefault: boolean;
      items: Array<{
        id: string;
        type: Bill['type'];
        section: Bill['section'];
        label: string;
        dueDate: string;
        amount: number;
        status: string;
        receivedAt: string | null;
        receivedAmount: number | null;
      }>;
    }
  >();

  bills
    .slice()
    .sort((a, b) => {
      const sourceRankA = a.source === 'manual' ? 1 : 0;
      const sourceRankB = b.source === 'manual' ? 1 : 0;

      if (sourceRankA !== sourceRankB) {
        return sourceRankA - sourceRankB;
      }

      return a.dueDate.localeCompare(b.dueDate);
    })
    .forEach((bill) => {
      const monthKey = bill.dueDate.slice(0, 7);
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          monthKey,
          monthLabel: dayjs(`${monthKey}-01`).format('YYYY年MM月'),
          isCurrentMonth: monthKey === currentMonth,
          expandedByDefault: monthKey === currentMonth,
          items: []
        });
      }

      monthMap.get(monthKey)?.items.push({
        id: bill.id,
        type: bill.type,
        section: bill.section,
        label: getBillTypeLabel(bill),
        dueDate: bill.dueDate,
        amount: bill.amount,
        status: deriveBillStatus(bill, now),
        receivedAt: bill.receivedAt,
        receivedAmount: bill.receivedAmount
      });
    });

  return Array.from(monthMap.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
}

export async function main(event: RentableUnitDetailEvent) {
  const db = resolveDb(event);
  const now = event.now ?? new Date().toISOString();
  const { assets, rooms, tenants, leases, bills } = await getAllDomainData(db);
  const room = rooms.find((item) => item.id === event.roomId);

  if (!room) {
    throw new Error(`Room ${event.roomId} not found.`);
  }

  const asset = assets.find((item) => item.id === room.assetId);
  if (!asset) {
    throw new Error(`Asset ${room.assetId} not found.`);
  }

  const leaseHistory = leases
    .filter((lease) => lease.roomId === room.id)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const activeLease =
    leaseHistory.find((lease) => deriveLeaseStatus(lease, now) === LEASE_STATUSES.active) ??
    null;
  const tenantHistory = leaseHistory
    .map((lease) => tenants.find((tenant) => tenant.id === lease.tenantId))
    .filter((tenant): tenant is NonNullable<typeof tenant> => Boolean(tenant));
  const activeBills = activeLease
    ? bills.filter((bill) => bill.leaseId === activeLease.id).length > 0
      ? bills.filter((bill) => bill.leaseId === activeLease.id)
      : await ensureBillsForLease(db, activeLease, { ...event, now })
    : [];
  const allBills = activeLease && bills.every((bill) => bill.leaseId !== activeLease.id)
    ? [...bills, ...activeBills]
    : bills;
  const summary = buildRentableUnitSummary({
    asset,
    room,
    leases,
    tenants,
    bills: allBills,
    now
  });
  const overdueCount = activeBills.filter((bill) => deriveBillStatus(bill, now) === BILL_STATUSES.overdue).length;

  return {
    asset,
    room,
    activeLease,
    leaseHistory,
    tenantHistory,
    summaryCard: {
      displayName: summary.displayName,
      mainStatus: summary.mainStatus,
      mainStatusLabel: summary.mainStatusLabel,
      riskTags: summary.riskTags,
      riskTagLabels: summary.riskTagLabels,
      currentTenantName: summary.currentTenantName,
      nextReceivableDate: summary.nextReceivableDate,
      nextReceivableAmount: summary.nextReceivableAmount,
      summaryHint: summary.summaryHint,
      overdueHint: overdueCount > 0 ? `当前有 ${overdueCount} 笔账单已逾期` : '',
      generatedAt: dayjs(now).format('YYYY-MM-DD')
    },
    monthlyBillGroups: buildMonthlyBillGroups(activeBills, now),
    historyCollapsedByDefault: true
  };
}
