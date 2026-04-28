"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const dayjs_1 = __importDefault(require("dayjs"));
const rentable_unit_1 = require("./shared/calculators/rentable-unit");
const repairs_1 = require("./shared/constants/repairs");
const statuses_1 = require("./shared/constants/statuses");
const bill_status_1 = require("./shared/calculators/bill-status");
const lease_lifecycle_1 = require("./shared/calculators/lease-lifecycle");
const owner_expense_repository_1 = require("./shared/repositories/owner-expense-repository");
const bill_repository_1 = require("./shared/repositories/bill-repository");
const repair_record_repository_1 = require("./shared/repositories/repair-record-repository");
const runtime_1 = require("./shared/runtime");
function getBillTypeLabel(bill) {
    if (bill.itemLabel) {
        return bill.itemLabel;
    }
    return ({
        rent: '租金',
        deposit: '押金',
        management: '管理费',
        fire_deposit: '消防押金',
        lock_card_deposit: '锁卡押金',
        water: '水费',
        electricity: '电费',
        property: '管理费',
        misc: '杂费',
        custom: '其他费用'
    }[bill.type ?? 'custom'] ?? '其他费用');
}
function getOwnerExpenseTypeLabel(expenseType) {
    return ({
        repair: '维修',
        cleaning: '保洁',
        caretaking: '打理',
        labor: '请人管理',
        other: '其他支出'
    }[expenseType] ?? '其他支出');
}
function buildMonthlyBillGroups(bills, now) {
    const currentMonth = (0, dayjs_1.default)(now).format('YYYY-MM');
    const monthMap = new Map();
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
                monthLabel: (0, dayjs_1.default)(`${monthKey}-01`).format('YYYY年MM月'),
                isCurrentMonth: monthKey === currentMonth,
                expandedByDefault: monthKey === currentMonth,
                items: []
            });
        }
        monthMap.get(monthKey)?.items.push({
            id: bill.id,
            leaseId: bill.leaseId,
            type: bill.type,
            section: bill.section,
            source: bill.source ?? 'system',
            label: getBillTypeLabel(bill),
            dueDate: bill.dueDate,
            amount: bill.amount,
            status: (0, bill_status_1.deriveBillStatus)(bill, now),
            responsibility: bill.responsibility,
            receivedAt: bill.receivedAt,
            receivedAmount: bill.receivedAmount,
            note: bill.note ?? '',
            meterReading: bill.meterReading,
            receiptId: bill.receiptId,
            receiptNo: bill.receiptNo,
            isReceivedAmountMismatch: bill.receivedAmount != null && Math.abs(Number(bill.receivedAmount) - Number(bill.amount || 0)) >= 0.01
        });
    });
    return Array.from(monthMap.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
}
function getDateKey(raw) {
    return String(raw ?? '').slice(0, 10);
}
function normalizeClosedDate(raw) {
    if (!raw) {
        return '';
    }
    const parsed = (0, dayjs_1.default)(raw);
    if (parsed.isValid()) {
        return parsed.format('YYYY-MM-DD');
    }
    const dateKey = getDateKey(raw);
    return /^\d{4}-\d{2}-\d{2}$/.test(dateKey) ? dateKey : '';
}
function resolveLeaseActualEndDate(lease) {
    const closedDate = normalizeClosedDate(lease.closedAt);
    if (closedDate) {
        return closedDate;
    }
    return lease.endDate;
}
function isLeaseEarlyTerminated(lease) {
    const closedDate = normalizeClosedDate(lease.closedAt);
    if (!closedDate) {
        return false;
    }
    return (0, dayjs_1.default)(closedDate).isBefore((0, dayjs_1.default)(lease.endDate), 'day');
}
function resolveLeaseTerminationRemark(lease) {
    const closedDate = normalizeClosedDate(lease.closedAt);
    if (!closedDate) {
        return '';
    }
    return isLeaseEarlyTerminated(lease) ? '提前结束租约' : '期满结束租约';
}
async function main(event) {
    const db = (0, runtime_1.resolveDb)(event);
    const landlordOpenId = (0, runtime_1.resolveLandlordOpenId)(event);
    const now = event.now ?? new Date().toISOString();
    const { assets, rooms, tenants, leases, bills, repairs } = await (0, runtime_1.getAllDomainData)(db, landlordOpenId);
    const tenantIdMap = new Map();
    tenants.forEach((tenant) => {
        if (tenant.id) {
            tenantIdMap.set(String(tenant.id), tenant);
        }
        const legacyDocId = tenant._id;
        if (legacyDocId) {
            tenantIdMap.set(String(legacyDocId), tenant);
        }
    });
    const findTenantByLeaseTenantId = (tenantId) => {
        if (!tenantId) {
            return null;
        }
        return tenantIdMap.get(String(tenantId).trim()) ?? null;
    };
    const resolveTenantName = (tenantId) => findTenantByLeaseTenantId(tenantId)?.name ?? '未知租户';
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
        .filter((lease) => (0, lease_lifecycle_1.deriveLeaseStatus)(lease, now) === statuses_1.LEASE_STATUSES.ended)
        .sort((a, b) => {
        const aSortKey = a.closedAt ?? `${a.endDate}T00:00:00.000Z`;
        const bSortKey = b.closedAt ?? `${b.endDate}T00:00:00.000Z`;
        return bSortKey.localeCompare(aSortKey);
    });
    const activeLease = leaseHistory.find((lease) => (0, lease_lifecycle_1.deriveLeaseStatus)(lease, now) === statuses_1.LEASE_STATUSES.active) ??
        null;
    const tenantHistory = leaseHistory
        .map((lease) => findTenantByLeaseTenantId(lease.tenantId))
        .filter((tenant) => Boolean(tenant))
        .filter((tenant, index, source) => source.findIndex((item) => item.id === tenant.id) === index);
    const activeBills = activeLease
        ? bills.filter((bill) => bill.leaseId === activeLease.id)
        : [];
    const allBills = bills;
    const meterDefaults = (0, bill_repository_1.resolveMeterDefaults)(allBills, room.id);
    const ownerExpenses = await (0, owner_expense_repository_1.listOwnerExpensesByRoom)(db, room.id, landlordOpenId);
    const ownerExpenseSummary = (0, owner_expense_repository_1.buildOwnerExpenseSummary)(ownerExpenses);
    const summary = (0, rentable_unit_1.buildRentableUnitSummary)({
        asset,
        room,
        leases,
        tenants,
        bills: allBills,
        now
    });
    const overdueCount = activeBills.filter((bill) => (0, bill_status_1.deriveBillStatus)(bill, now) === statuses_1.BILL_STATUSES.overdue).length;
    const repairStats = (0, repair_record_repository_1.buildRoomRepairStats)({
        roomId: room.id,
        leases,
        records: repairs,
        now
    });
    const leaseTenantMap = new Map(leaseHistory.map((lease) => [
        lease.id,
        resolveTenantName(lease.tenantId)
    ]));
    const leaseMap = new Map(leaseHistory.map((lease) => [lease.id, lease]));
    const repairHistory = repairs
        .filter((item) => item.roomId === room.id)
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.updatedAt.localeCompare(a.updatedAt))
        .map((item) => ({
        ...item,
        categoryLabel: repairs_1.REPAIR_CATEGORY_LABELS[item.category],
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
            generatedAt: (0, dayjs_1.default)(now).format('YYYY-MM-DD')
        },
        meterDefaults,
        ownerExpenseSummary,
        ownerExpenses: ownerExpenses.slice(0, 10).map((item) => ({
            ...item,
            typeLabel: getOwnerExpenseTypeLabel(item.expenseType)
        })),
        monthlyBillGroups: buildMonthlyBillGroups(activeBills, now),
        repairStats,
        tenantPeriodRepairs,
        repairHistory,
        historyCollapsedByDefault: true
    };
}
