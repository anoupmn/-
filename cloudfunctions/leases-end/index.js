"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const lease_repository_1 = require("./shared/repositories/lease-repository");
const collections_1 = require("./shared/constants/collections");
const runtime_1 = require("./shared/runtime");
async function main(event) {
    const db = (0, runtime_1.resolveDb)(event);
    const landlordOpenId = (0, runtime_1.resolveLandlordOpenId)(event);
    const leases = await (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.leases);
    const ownedLease = leases.find((item) => item.id === event.leaseId && item.landlordOpenId === landlordOpenId);
    if (!ownedLease) {
        throw new Error(`Lease ${event.leaseId} not found.`);
    }
    return (0, lease_repository_1.endLease)(db, event.leaseId, event);
}
