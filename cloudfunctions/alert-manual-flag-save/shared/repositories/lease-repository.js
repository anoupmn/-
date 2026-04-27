"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLease = createLease;
exports.updateLease = updateLease;
exports.endLease = endLease;
exports.listLeasesByRoom = listLeasesByRoom;
exports.getLeaseDeleteBlockers = getLeaseDeleteBlockers;
exports.deleteLeaseSafely = deleteLeaseSafely;
const collections_1 = require("../constants/collections");
const lease_lifecycle_1 = require("../calculators/lease-lifecycle");
const statuses_1 = require("../constants/statuses");
const lease_1 = require("../schemas/lease");
const runtime_1 = require("../runtime");
const bill_repository_1 = require("./bill-repository");
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
    (0, lease_lifecycle_1.assertSingleActiveLease)(leases, lease, (0, runtime_1.resolveNow)(event));
    await (0, runtime_1.insertRecord)(db, collections_1.COLLECTIONS.leases, lease);
    await (0, bill_repository_1.syncBillsForLease)(db, lease, event);
    return lease;
}
async function updateLease(db, leaseId, changes, event) {
    const currentLease = await (0, runtime_1.findById)(db, collections_1.COLLECTIONS.leases, leaseId);
    if (!currentLease) {
        throw new Error(`Lease ${leaseId} not found.`);
    }
    const nextLease = lease_1.leaseSchema.parse({
        ...currentLease,
        ...changes,
        feeRules: resolveNextFeeRules(currentLease, changes),
        updatedAt: (0, runtime_1.resolveNow)(event)
    });
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
    const duplicateActiveLeases = leases.filter((lease) => lease.id !== leaseId &&
        lease.roomId === currentLease.roomId &&
        (0, lease_lifecycle_1.deriveLeaseStatus)(lease, (0, runtime_1.resolveNow)(event)) === statuses_1.LEASE_STATUSES.active);
    for (const lease of duplicateActiveLeases) {
        await (0, runtime_1.updateRecord)(db, collections_1.COLLECTIONS.leases, lease.id, {
            closedAt: result.closedLease.closedAt,
            updatedAt: result.closedLease.updatedAt
        });
    }
    const unpaidBills = await listLeaseBillsSafely(db, leaseId).then((bills) => bills.filter((bill) => !bill.receivedAt && bill.receivedAmount == null));
    return {
        lease: updatedLease,
        currentStatus: result.currentStatus,
        unpaidBillSummary: {
            count: unpaidBills.length,
            amount: unpaidBills.reduce((sum, bill) => sum + Number(bill.amount || 0), 0)
        },
        unpaidBillOptions: unpaidBills.length > 0
            ? ['keep_debt', 'void_unpaid_system_bills', 'adjust_end_date_and_resync']
            : []
    };
}
async function listLeasesByRoom(db, roomId) {
    const leases = await (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.leases);
    return leases.filter((lease) => lease.roomId === roomId);
}
async function listLeaseBillsSafely(db, leaseId) {
    try {
        const bills = await (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.bills);
        return bills.filter((bill) => bill.leaseId === leaseId);
    }
    catch {
        return [];
    }
}
async function listRecordsSafely(db, collectionName, leaseId) {
    try {
        const records = await (0, runtime_1.listAll)(db, collectionName);
        return records.filter((record) => record.leaseId === leaseId);
    }
    catch {
        return [];
    }
}
async function getLeaseDeleteBlockers(db, leaseId, landlordOpenId) {
    const [bills, repairs, ownerExpenses, receipts] = await Promise.all([
        listLeaseBillsSafely(db, leaseId),
        listRecordsSafely(db, collections_1.COLLECTIONS.repairRecords, leaseId),
        listRecordsSafely(db, collections_1.COLLECTIONS.ownerExpenses, leaseId),
        listRecordsSafely(db, collections_1.COLLECTIONS.receipts, leaseId)
    ]);
    const landlordBills = bills.filter((bill) => bill.landlordOpenId === landlordOpenId);
    const billIds = new Set(landlordBills.map((bill) => bill.id));
    const hasReceiptReference = landlordBills.some((bill) => Boolean(bill.receiptId)) ||
        receipts.some((receipt) => {
            if (receipt.leaseId === leaseId) {
                return true;
            }
            if (receipt.billId && billIds.has(receipt.billId)) {
                return true;
            }
            return Array.isArray(receipt.billIds) && receipt.billIds.some((billId) => billIds.has(String(billId)));
        });
    const blockers = [];
    const paidBillCount = landlordBills.filter((bill) => bill.receivedAt && bill.receivedAmount !== null).length;
    if (paidBillCount > 0) {
        blockers.push({ code: 'paid_bill', count: paidBillCount });
    }
    if (hasReceiptReference) {
        blockers.push({ code: 'receipt', count: 1 });
    }
    if (repairs.length > 0) {
        blockers.push({ code: 'repair_record', count: repairs.length });
    }
    if (ownerExpenses.length > 0) {
        blockers.push({ code: 'owner_expense', count: ownerExpenses.length });
    }
    return blockers;
}
async function deleteLeaseSafely(db, leaseId, landlordOpenId, options = {}) {
    const lease = await (0, runtime_1.findById)(db, collections_1.COLLECTIONS.leases, leaseId);
    if (!lease || lease.landlordOpenId !== landlordOpenId) {
        throw new Error(`Lease ${leaseId} not found.`);
    }
    const bills = await listLeaseBillsSafely(db, leaseId);
    const deletableBills = bills.filter((bill) => bill.landlordOpenId === landlordOpenId &&
        !bill.receivedAt &&
        bill.receivedAmount === null &&
        !bill.receiptId);
    const blockers = await getLeaseDeleteBlockers(db, leaseId, landlordOpenId);
    const summary = {
        canDelete: blockers.length === 0,
        blockers,
        unpaidBillCount: deletableBills.length
    };
    if (!summary.canDelete || options.confirm !== true) {
        return {
            ...summary,
            deleted: false,
            deletedBillCount: 0
        };
    }
    for (const bill of deletableBills) {
        await (0, runtime_1.removeRecordsByQuery)(db, collections_1.COLLECTIONS.bills, { id: bill.id, landlordOpenId });
    }
    await (0, runtime_1.removeRecordsByQuery)(db, collections_1.COLLECTIONS.leases, { id: leaseId, landlordOpenId });
    return {
        ...summary,
        deleted: true,
        deletedBillCount: deletableBills.length
    };
}
