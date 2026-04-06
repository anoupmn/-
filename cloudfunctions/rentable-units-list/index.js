"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const rentable_unit_1 = require("./shared/calculators/rentable-unit");
const lease_lifecycle_1 = require("./shared/calculators/lease-lifecycle");
const statuses_1 = require("./shared/constants/statuses");
const bill_repository_1 = require("./shared/repositories/bill-repository");
const runtime_1 = require("./shared/runtime");
async function main(event) {
    const db = (0, runtime_1.resolveDb)(event);
    const now = event.now ?? new Date().toISOString();
    const { assets, rooms, tenants, leases, bills } = await (0, runtime_1.getAllDomainData)(db);
    const ensuredBills = [...bills];
    for (const lease of leases) {
        if ((0, lease_lifecycle_1.deriveLeaseStatus)(lease, now) !== statuses_1.LEASE_STATUSES.active) {
            continue;
        }
        const hasBills = ensuredBills.some((bill) => bill.leaseId === lease.id);
        if (hasBills) {
            continue;
        }
        const backfilledBills = await (0, bill_repository_1.ensureBillsForLease)(db, lease, { ...event, now });
        ensuredBills.push(...backfilledBills);
    }
    return rooms.map((room) => {
        const asset = assets.find((item) => item.id === room.assetId);
        if (!asset) {
            throw new Error(`Asset ${room.assetId} not found for room ${room.id}.`);
        }
        return (0, rentable_unit_1.buildRentableUnitSummary)({
            asset,
            room,
            leases,
            tenants,
            bills: ensuredBills,
            now
        });
    });
}
