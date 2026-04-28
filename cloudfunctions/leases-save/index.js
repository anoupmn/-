"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const lease_repository_1 = require("./shared/repositories/lease-repository");
const collections_1 = require("./shared/constants/collections");
const runtime_1 = require("./shared/runtime");
async function main(event) {
    const db = (0, runtime_1.resolveDb)(event);
    const landlordOpenId = (0, runtime_1.resolveLandlordOpenId)(event);
    const [rooms, tenants] = await Promise.all([
        (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.rooms),
        (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.tenants)
    ]);
    const ownedRoom = rooms.find((item) => item.id === event.lease.roomId && item.landlordOpenId === landlordOpenId);
    if (!ownedRoom) {
        throw new Error(`Room ${event.lease.roomId} not found.`);
    }
    const ownedTenant = tenants.find((item) => item.id === event.lease.tenantId && item.landlordOpenId === landlordOpenId);
    if (!ownedTenant) {
        throw new Error(`Tenant ${event.lease.tenantId} not found.`);
    }
    if (event.leaseId) {
        const leases = await (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.leases);
        const ownedLease = leases.find((item) => item.id === event.leaseId && item.landlordOpenId === landlordOpenId);
        if (!ownedLease) {
            throw new Error(`Lease ${event.leaseId} not found.`);
        }
        return (0, lease_repository_1.updateLease)(db, event.leaseId, event.lease, event);
    }
    if (event.renewFromLeaseId) {
        const leases = await (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.leases);
        const sourceLease = leases.find((item) => item.id === event.renewFromLeaseId && item.landlordOpenId === landlordOpenId);
        if (!sourceLease) {
            throw new Error(`Lease ${event.renewFromLeaseId} not found.`);
        }
        if (sourceLease.roomId !== event.lease.roomId || sourceLease.tenantId !== event.lease.tenantId) {
            throw new Error('Renewal lease must keep the same room and tenant.');
        }
        const renewalLease = await (0, lease_repository_1.createLease)(db, landlordOpenId, {
            ...event.lease,
            renewalFromLeaseId: sourceLease.id
        }, event);
        const renewedAt = (0, runtime_1.resolveNow)(event);
        await (0, runtime_1.updateRecord)(db, collections_1.COLLECTIONS.leases, sourceLease.id, {
            renewedToLeaseId: renewalLease.id,
            renewedAt,
            renewalEndDate: renewalLease.endDate,
            updatedAt: renewedAt
        });
        return renewalLease;
    }
    return (0, lease_repository_1.createLease)(db, landlordOpenId, event.lease, event);
}
