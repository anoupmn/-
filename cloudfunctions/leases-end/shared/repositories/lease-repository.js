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
    const currentLeaseSnapshot = await db.collection(collections_1.COLLECTIONS.leases).where({ id: leaseId }).get();
    const currentLease = currentLeaseSnapshot.data?.[0] ?? null;
    if (!currentLease) {
        throw new Error(`Lease ${leaseId} not found.`);
    }
    const roomLeasesSnapshot = await db.collection(collections_1.COLLECTIONS.leases).where({ roomId: currentLease.roomId }).get();
    const roomLeases = roomLeasesSnapshot.data ?? [];
    const result = (0, lease_lifecycle_1.closeLeaseAndDeriveUnitStatus)(currentLease, roomLeases, (0, runtime_1.resolveNow)(event));
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
