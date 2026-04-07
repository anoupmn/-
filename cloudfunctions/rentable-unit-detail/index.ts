import dayjs from 'dayjs';

import { buildRentableUnitSummary } from './shared/calculators/rentable-unit';
import { REPAIR_CATEGORY_LABELS } from './shared/constants/repairs';
import { BILL_STATUSES, LEASE_STATUSES } from './shared/constants/statuses';
import { deriveBillStatus } from './shared/calculators/bill-status';
import { deriveLeaseStatus } from './shared/calculators/lease-lifecycle';
import { ensureBillsForLease } from './shared/repositories/bill-repository';
import { buildRoomRepairStats } from './shared/repositories/repair-record-repository';
import { getAllDomainData, resolveLandlordOpenId, type CloudEventBase, resolveDb } from './shared/runtime';
import type { Bill } from './shared/schemas/bill';
import type { Lease } from './shared/schemas/lease';

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
        source: Bill['source'];
        label: string;
        dueDate: string;
        amount: number;
        status: string;
        receivedAt: string | null;
        receivedAmount: number | null;
        isReceivedAmountMismatch: boolean;
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
        source: bill.source ?? 'system',
        label: getBillTypeLabel(bill),
        dueDate: bill.dueDate,
        amount: bill.amount,
        status: deriveBillStatus(bill, now),
        receivedAt: bill.receivedAt,
        receivedAmount: bill.receivedAmount,
        isReceivedAmountMismatch:
          bill.receivedAmount != null && Math.abs(Number(bill.receivedAmount) - Number(bill.amount || 0)) >= 0.01
      });
    });

  return Array.from(monthMap.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
}

function getDateKey(raw?: string | null) {
  return String(raw ?? '').slice(0, 10);
}

function normalizeClosedDate(raw?: string | null) {
  if (!raw) {
    return '';
  }

  const parsed = dayjs(raw);
  if (parsed.isValid()) {
    return parsed.format('YYYY-MM-DD');
  }

  const dateKey = getDateKey(raw);
  return /^\d{4}-\d{2}-\d{2}$/.test(dateKey) ? dateKey : '';
}

function resolveLeaseActualEndDate(lease: Pick<Lease, 'endDate' | 'closedAt'>) {
  const closedDate = normalizeClosedDate(lease.closedAt);
  if (closedDate) {
    return closedDate;
  }

  return lease.endDate;
}

function isLeaseEarlyTerminated(lease: Pick<Lease, 'endDate' | 'closedAt'>) {
  const closedDate = normalizeClosedDate(lease.closedAt);
  if (!closedDate) {
    return false;
  }

  return dayjs(closedDate).isBefore(dayjs(lease.endDate), 'day');
}

function resolveLeaseTerminationRemark(lease: Pick<Lease, 'endDate' | 'closedAt'>) {
  const closedDate = normalizeClosedDate(lease.closedAt);
  if (!closedDate) {
    return '';
  }

  return isLeaseEarlyTerminated(lease) ? '提前结束租约' : '期满结束租约';
}

export async function main(event: RentableUnitDetailEvent) {
  const db = resolveDb(event);
  const landlordOpenId = resolveLandlordOpenId(event);
  const now = event.now ?? new Date().toISOString();
  const { assets, rooms, tenants, leases, bills, repairs } = await getAllDomainData(db, landlordOpenId);

  const tenantIdMap = new Map<string, (typeof tenants)[number]>();
  tenants.forEach((tenant) => {
    if (tenant.id) {
      tenantIdMap.set(String(tenant.id), tenant);
    }

    const legacyDocId = (tenant as { _id?: unknown })._id;
    if (legacyDocId) {
      tenantIdMap.set(String(legacyDocId), tenant);
    }
  });

  const findTenantByLeaseTenantId = (tenantId?: string | null) => {
    if (!tenantId) {
      return null;
    }

    return tenantIdMap.get(String(tenantId).trim()) ?? null;
  };

  const resolveTenantName = (tenantId?: string | null) =>
    findTenantByLeaseTenantId(tenantId)?.name ?? '未知租户';

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
  const historicalLeases = leaseHistory
    .filter((lease) => deriveLeaseStatus(lease, now) === LEASE_STATUSES.ended)
    .sort((a, b) => {
      const aSortKey = a.closedAt ?? `${a.endDate}T00:00:00.000Z`;
      const bSortKey = b.closedAt ?? `${b.endDate}T00:00:00.000Z`;
      return bSortKey.localeCompare(aSortKey);
    });
  const activeLease =
    leaseHistory.find((lease) => deriveLeaseStatus(lease, now) === LEASE_STATUSES.active) ??
    null;
  const tenantHistory = leaseHistory
    .map((lease) => findTenantByLeaseTenantId(lease.tenantId))
    .filter((tenant): tenant is NonNullable<typeof tenant> => Boolean(tenant))
    .filter((tenant, index, source) => source.findIndex((item) => item.id === tenant.id) === index);
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
  const repairStats = buildRoomRepairStats({
    roomId: room.id,
    leases,
    records: repairs,
    now
  });
  const leaseTenantMap = new Map(
    leaseHistory.map((lease) => [
      lease.id,
      resolveTenantName(lease.tenantId)
    ])
  );
  const leaseMap = new Map(leaseHistory.map((lease) => [lease.id, lease]));
  const repairHistory = repairs
    .filter((item) => item.roomId === room.id)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.updatedAt.localeCompare(a.updatedAt))
    .map((item) => ({
      ...item,
      categoryLabel: REPAIR_CATEGORY_LABELS[item.category],
      tenantName: item.tenantId ? resolveTenantName(item.tenantId) : '',
      leasePeriod: item.leaseId
        ? (() => {
            const matchedLease = leaseMap.get(item.leaseId);
            if (!matchedLease) {
              return '';
            }

            return `${matchedLease.startDate} 至 ${resolveLeaseActualEndDate(matchedLease)}`;
          })()
        : ''
    }));
  const tenantPeriodRepairs = repairStats.perLeaseCounts.map((item) => ({
    ...item,
    tenantName: leaseTenantMap.get(item.leaseId) ?? '未知租户'
  }));

  return {
    asset,
    room,
    activeLease,
    leaseHistory: historicalLeases.map((lease) => ({
      ...lease,
      originalEndDate: lease.endDate,
      actualEndDate: resolveLeaseActualEndDate(lease),
      originalPeriodLabel: `${lease.startDate} 至 ${lease.endDate}`,
      actualPeriodLabel: `${lease.startDate} 至 ${resolveLeaseActualEndDate(lease)}`,
      isEarlyTerminated: isLeaseEarlyTerminated(lease),
      terminationRemark: resolveLeaseTerminationRemark(lease),
      tenantName: leaseTenantMap.get(lease.id) ?? '未知租户'
    })),
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
    repairStats,
    tenantPeriodRepairs,
    repairHistory,
    historyCollapsedByDefault: true
  };
}
