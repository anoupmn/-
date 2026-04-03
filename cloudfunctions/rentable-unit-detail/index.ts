import dayjs from 'dayjs';

import { buildRentableUnitSummary } from '../shared/calculators/rentable-unit';
import { BILL_STATUSES, LEASE_STATUSES } from '../shared/constants/statuses';
import { deriveBillStatus } from '../shared/calculators/bill-status';
import { deriveLeaseStatus } from '../shared/calculators/lease-lifecycle';
import { getAllDomainData, type CloudEventBase, resolveDb } from '../shared/runtime';
import type { Bill } from '../shared/schemas/bill';

export interface RentableUnitDetailEvent extends CloudEventBase {
  roomId: string;
}

function groupFeeSections(bills: Bill[], now: string) {
  const sections = [
    { key: 'rent', title: '房租' },
    { key: 'deposit', title: '押金' },
    { key: 'non_rent', title: '非房租类费用' }
  ] as const;

  return sections.map((section) => ({
    key: section.key,
    title: section.title,
    items: bills
      .filter((bill) => bill.section === section.key)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .map((bill) => ({
        id: bill.id,
        type: bill.type,
        label: bill.itemLabel ?? bill.type,
        dueDate: bill.dueDate,
        amount: bill.amount,
        status: deriveBillStatus(bill, now),
        receivedAt: bill.receivedAt,
        receivedAmount: bill.receivedAmount
      }))
  }));
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
  const activeBills = activeLease ? bills.filter((bill) => bill.leaseId === activeLease.id) : [];
  const summary = buildRentableUnitSummary({
    asset,
    room,
    leases,
    tenants,
    bills,
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
    primaryActions: [
      { key: 'receive_bill', label: '登记收款' },
      { key: 'view_all_bills', label: '查看全部账单' }
    ],
    feeSections: groupFeeSections(activeBills, now),
    historyCollapsedByDefault: true
  };
}
