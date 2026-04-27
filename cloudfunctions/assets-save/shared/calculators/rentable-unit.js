"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRentableUnitSummary = buildRentableUnitSummary;
const dayjs_1 = __importDefault(require("dayjs"));
const statuses_1 = require("../constants/statuses");
const bill_status_1 = require("./bill-status");
const lease_lifecycle_1 = require("./lease-lifecycle");
const lease_1 = require("../schemas/lease");
function buildRentableUnitSummary(input) {
    const { asset, room, leases, tenants, bills = [], now } = input;
    const roomLeases = leases.filter((lease) => lease.roomId === room.id);
    const activeLease = roomLeases.find((lease) => (0, lease_lifecycle_1.deriveLeaseStatus)(lease, now) === statuses_1.LEASE_STATUSES.active) ?? null;
    const futureLease = roomLeases
        .filter((lease) => (0, lease_lifecycle_1.deriveLeaseStatus)(lease, now) === statuses_1.LEASE_STATUSES.future)
        .sort((a, b) => (0, dayjs_1.default)(a.startDate).valueOf() - (0, dayjs_1.default)(b.startDate).valueOf())[0] ?? null;
    const tenant = activeLease
        ? tenants.find((item) => item.id === activeLease.tenantId) ?? null
        : null;
    let mainStatus = statuses_1.UNIT_MAIN_STATUSES.vacant;
    let nextReceivableDate = '';
    let nextReceivableAmount = 0;
    let overdueDays = 0;
    let vacancyDays = 0;
    const riskTags = [];
    const activeLeaseBills = activeLease
        ? bills.filter((bill) => bill.leaseId === activeLease.id)
        : [];
    const outstandingBills = activeLeaseBills
        .map((bill) => ({
        ...bill,
        status: (0, bill_status_1.deriveBillStatus)(bill, now)
    }))
        .filter((bill) => bill.status !== statuses_1.BILL_STATUSES.paid)
        .sort((a, b) => (0, dayjs_1.default)(a.dueDate).valueOf() - (0, dayjs_1.default)(b.dueDate).valueOf());
    const coreOutstandingBills = outstandingBills.filter((bill) => (0, bill_status_1.isBillOverdueTrackable)(bill));
    if (activeLease) {
        mainStatus = statuses_1.UNIT_MAIN_STATUSES.occupied;
        if (coreOutstandingBills[0]) {
            nextReceivableDate = coreOutstandingBills[0].dueDate;
            nextReceivableAmount = coreOutstandingBills[0].amount;
        }
        else {
            const feeRules = (0, lease_1.getLeaseFeeRules)(activeLease);
            nextReceivableDate = (0, lease_lifecycle_1.getNextReceivableDate)(activeLease, now);
            nextReceivableAmount = feeRules.rent.amount;
        }
        if ((0, dayjs_1.default)(activeLease.endDate).diff((0, dayjs_1.default)(now), 'day') <= 15 ||
            outstandingBills.some((bill) => (0, bill_status_1.isBillWithinUpcomingWindow)(bill, now))) {
            riskTags.push(statuses_1.BILL_RISK_TAGS.expiring);
        }
        const earliestOverdueBill = outstandingBills.find((bill) => bill.status === statuses_1.BILL_STATUSES.overdue);
        if (earliestOverdueBill) {
            riskTags.push(statuses_1.BILL_RISK_TAGS.overdue, statuses_1.BILL_RISK_TAGS.abnormal);
            overdueDays = (0, dayjs_1.default)(now).diff((0, dayjs_1.default)(earliestOverdueBill.dueDate), 'day');
        }
    }
    else if (futureLease) {
        mainStatus = statuses_1.UNIT_MAIN_STATUSES.pendingMoveIn;
    }
    else {
        const endedLease = roomLeases
            .filter((lease) => (0, lease_lifecycle_1.deriveLeaseStatus)(lease, now) === statuses_1.LEASE_STATUSES.ended)
            .sort((a, b) => (0, dayjs_1.default)(b.endDate).valueOf() - (0, dayjs_1.default)(a.endDate).valueOf())[0] ?? null;
        if (endedLease) {
            vacancyDays = (0, dayjs_1.default)(now).diff((0, dayjs_1.default)(endedLease.endDate), 'day');
        }
    }
    let summaryHint = '';
    if (riskTags.includes(statuses_1.BILL_RISK_TAGS.overdue)) {
        summaryHint = `已逾期 ${overdueDays} 天`;
    }
    else if (outstandingBills.some((bill) => (0, bill_status_1.isBillWithinUpcomingWindow)(bill, now))) {
        summaryHint = '15 天内有账单到期';
    }
    else if (mainStatus === statuses_1.UNIT_MAIN_STATUSES.vacant && vacancyDays > 0) {
        summaryHint = `已空置 ${vacancyDays} 天`;
    }
    return {
        roomId: room.id,
        assetId: asset.id,
        displayName: room.isWholeUnitDefault ? asset.name : `${asset.name} · ${room.name}`,
        currentStatus: mainStatus,
        mainStatus,
        mainStatusLabel: statuses_1.UNIT_MAIN_STATUS_LABELS[mainStatus],
        currentTenantName: tenant?.name ?? '',
        nextReceivableDate,
        nextReceivableAmount,
        hasAbnormal: riskTags.includes(statuses_1.BILL_RISK_TAGS.abnormal),
        riskTags,
        riskTagLabels: riskTags.map((tag) => statuses_1.BILL_RISK_TAG_LABELS[tag]),
        summaryHint,
        overdueDays,
        vacancyDays
    };
}
