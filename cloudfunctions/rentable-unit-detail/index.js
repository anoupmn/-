"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const dayjs_1 = __importDefault(require("dayjs"));
const rentable_unit_1 = require("../shared/calculators/rentable-unit");
const statuses_1 = require("../shared/constants/statuses");
const bill_status_1 = require("../shared/calculators/bill-status");
const lease_lifecycle_1 = require("../shared/calculators/lease-lifecycle");
const bill_repository_1 = require("../shared/repositories/bill-repository");
const runtime_1 = require("../shared/runtime");
function getBillTypeLabel(bill) {
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
            type: bill.type,
            section: bill.section,
            label: getBillTypeLabel(bill),
            dueDate: bill.dueDate,
            amount: bill.amount,
            status: (0, bill_status_1.deriveBillStatus)(bill, now),
            receivedAt: bill.receivedAt,
            receivedAmount: bill.receivedAmount
        });
    });
    return Array.from(monthMap.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
}
async function main(event) {
    const db = (0, runtime_1.resolveDb)(event);
    const now = event.now ?? new Date().toISOString();
    const { assets, rooms, tenants, leases, bills } = await (0, runtime_1.getAllDomainData)(db);
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
    const activeLease = leaseHistory.find((lease) => (0, lease_lifecycle_1.deriveLeaseStatus)(lease, now) === statuses_1.LEASE_STATUSES.active) ??
        null;
    const tenantHistory = leaseHistory
        .map((lease) => tenants.find((tenant) => tenant.id === lease.tenantId))
        .filter((tenant) => Boolean(tenant));
    const activeBills = activeLease
        ? bills.filter((bill) => bill.leaseId === activeLease.id).length > 0
            ? bills.filter((bill) => bill.leaseId === activeLease.id)
            : await (0, bill_repository_1.ensureBillsForLease)(db, activeLease, { ...event, now })
        : [];
    const allBills = activeLease && bills.every((bill) => bill.leaseId !== activeLease.id)
        ? [...bills, ...activeBills]
        : bills;
    const summary = (0, rentable_unit_1.buildRentableUnitSummary)({
        asset,
        room,
        leases,
        tenants,
        bills: allBills,
        now
    });
    const overdueCount = activeBills.filter((bill) => (0, bill_status_1.deriveBillStatus)(bill, now) === statuses_1.BILL_STATUSES.overdue).length;
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
            generatedAt: (0, dayjs_1.default)(now).format('YYYY-MM-DD')
        },
        monthlyBillGroups: buildMonthlyBillGroups(activeBills, now),
        historyCollapsedByDefault: true
    };
}
