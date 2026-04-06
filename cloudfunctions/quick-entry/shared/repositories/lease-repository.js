"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLease = createLease;
exports.updateLease = updateLease;
exports.endLease = endLease;
exports.listLeasesByRoom = listLeasesByRoom;
const collections_1 = require("../constants/collections");
const lease_lifecycle_1 = require("../calculators/lease-lifecycle");
const lease_1 = require("../schemas/lease");
const runtime_1 = require("../runtime");
const bill_repository_1 = require("./bill-repository");
function normalizeDateKey(value) {
    return String(value ?? '').slice(0, 10);
}
function resolveEffectiveLeaseEndDate(lease) {
    const contractEndDate = normalizeDateKey(lease.endDate);
    const closedDate = normalizeDateKey(lease.closedAt);
    if (closedDate && closedDate < contractEndDate) {
        return closedDate;
    }
    return contractEndDate;
}
function isDateRangeOverlapped(leftStartDate, leftEndDate, rightStartDate, rightEndDate) {
    return leftStartDate <= rightEndDate && rightStartDate <= leftEndDate;
}
function assertNoLeaseDateOverlap(leases, nextLease, excludeLeaseId) {
    const nextStartDate = normalizeDateKey(nextLease.startDate);
    const nextEndDate = normalizeDateKey(nextLease.endDate);
    if (!nextStartDate || !nextEndDate) {
        throw new Error('租约日期不完整，请填写开始和结束日期后再保存。');
    }
    if (nextStartDate > nextEndDate) {
        throw new Error('租约开始日期不能晚于结束日期。');
    }
    const conflictLease = leases
        .filter((lease) => lease.id !== excludeLeaseId && lease.roomId === nextLease.roomId && lease.landlordOpenId === nextLease.landlordOpenId)
        .find((lease) => isDateRangeOverlapped(normalizeDateKey(lease.startDate), resolveEffectiveLeaseEndDate(lease), nextStartDate, nextEndDate));
    if (conflictLease) {
        throw new Error(`租约时间冲突：该房间已存在租约 ${normalizeDateKey(conflictLease.startDate)} 至 ${resolveEffectiveLeaseEndDate(conflictLease)}，请调整租期后再保存。`);
    }
}
function resolveNextFeeRules(currentLease, changes) {
    const baseFeeRules = (0, lease_1.getLeaseFeeRules)(currentLease);
    if (changes.feeRules) {
        return (0, lease_1.getLeaseFeeRules)({
            rentAmount: changes.rentAmount ?? currentLease.rentAmount,
            depositAmount: changes.depositAmount ?? currentLease.depositAmount,
            feeRules: changes.feeRules
        });
    }
    return (0, lease_1.getLeaseFeeRules)({
        rentAmount: changes.rentAmount ?? currentLease.rentAmount,
        depositAmount: changes.depositAmount ?? currentLease.depositAmount,
        feeRules: {
            ...baseFeeRules,
            rent: {
                ...baseFeeRules.rent,
                amount: changes.rentAmount ?? baseFeeRules.rent.amount
            },
            deposit: {
                ...baseFeeRules.deposit,
                amount: changes.depositAmount ?? baseFeeRules.deposit.amount
            }
        }
    });
}
async function createLease(db, landlordOpenId, input, event) {
    const leases = await (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.leases);
    const lease = lease_1.leaseSchema.parse({
        id: (0, runtime_1.createId)('lease'),
        landlordOpenId,
        ...input,
        feeRules: (0, lease_1.getLeaseFeeRules)({
            rentAmount: input.rentAmount,
            depositAmount: input.depositAmount,
            feeRules: input.feeRules
        }),
        note: input.note ?? '',
        closedAt: null,
        createdAt: (0, runtime_1.resolveNow)(event),
        updatedAt: (0, runtime_1.resolveNow)(event)
    });
    assertNoLeaseDateOverlap(leases, lease);
    (0, lease_lifecycle_1.assertSingleActiveLease)(leases, lease, (0, runtime_1.resolveNow)(event));
    await (0, runtime_1.insertRecord)(db, collections_1.COLLECTIONS.leases, lease);
    await (0, bill_repository_1.syncBillsForLease)(db, lease, event);
    return lease;
}
async function updateLease(db, leaseId, changes, event) {
    const currentLease = await (0, runtime_1.findById)(db, collections_1.COLLECTIONS.leases, leaseId);
    const leases = await (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.leases);
    if (!currentLease) {
        throw new Error(`Lease ${leaseId} not found.`);
    }
    const nextLease = lease_1.leaseSchema.parse({
        ...currentLease,
        ...changes,
        feeRules: resolveNextFeeRules(currentLease, changes),
        updatedAt: (0, runtime_1.resolveNow)(event)
    });
    assertNoLeaseDateOverlap(leases, nextLease, leaseId);
    (0, lease_lifecycle_1.assertSingleActiveLease)(leases.filter((lease) => lease.id !== leaseId), nextLease, (0, runtime_1.resolveNow)(event));
    const updatedLease = await (0, runtime_1.updateRecord)(db, collections_1.COLLECTIONS.leases, leaseId, {
        ...changes,
        feeRules: nextLease.feeRules,
        updatedAt: (0, runtime_1.resolveNow)(event)
    });
    await (0, bill_repository_1.syncBillsForLease)(db, updatedLease, event);
    return updatedLease;
}
async function endLease(db, leaseId, event) {
    const leases = await (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.leases);
    const currentLease = leases.find((lease) => lease.id === leaseId);
    if (!currentLease) {
        throw new Error(`Lease ${leaseId} not found.`);
    }
    const result = (0, lease_lifecycle_1.closeLeaseAndDeriveUnitStatus)(currentLease, leases.filter((lease) => lease.roomId === currentLease.roomId), (0, runtime_1.resolveNow)(event));
    const updatedLease = await (0, runtime_1.updateRecord)(db, collections_1.COLLECTIONS.leases, leaseId, {
        closedAt: result.closedLease.closedAt,
        updatedAt: result.closedLease.updatedAt
    });
    return {
        lease: updatedLease,
        currentStatus: result.currentStatus
    };
}
async function listLeasesByRoom(db, roomId) {
    const leases = await (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.leases);
    return leases.filter((lease) => lease.roomId === roomId);
}
