"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const lease_repository_1 = require("./shared/repositories/lease-repository");
const tenant_repository_1 = require("./shared/repositories/tenant-repository");
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
    const providedTenantId = String(event.lease.tenantId || '').trim();
    if (event.leaseId) {
        const ownedTenant = tenants.find((item) => item.id === providedTenantId && item.landlordOpenId === landlordOpenId);
        if (!ownedTenant) {
            throw new Error(`Tenant ${providedTenantId} not found.`);
        }
        const leases = await (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.leases);
        const ownedLease = leases.find((item) => item.id === event.leaseId && item.landlordOpenId === landlordOpenId);
        if (!ownedLease) {
            throw new Error(`Lease ${event.leaseId} not found.`);
        }
        return (0, lease_repository_1.updateLease)(db, event.leaseId, {
            ...event.lease,
            tenantId: providedTenantId
        }, event);
    }
    let tenantId = providedTenantId;
    let createdTenantId = '';
    if (tenantId) {
        const ownedTenant = tenants.find((item) => item.id === tenantId && item.landlordOpenId === landlordOpenId);
        if (!ownedTenant) {
            throw new Error(`Tenant ${tenantId} not found.`);
        }
    }
    else if (event.tenant) {
        const createdTenant = await (0, tenant_repository_1.createTenant)(db, landlordOpenId, event.tenant, event);
        tenantId = createdTenant.id;
        createdTenantId = createdTenant.id;
    }
    else {
        throw new Error('tenantId or tenant is required.');
    }
    try {
        return await (0, lease_repository_1.createLease)(db, landlordOpenId, {
            ...event.lease,
            tenantId
        }, event);
    }
    catch (error) {
        if (createdTenantId) {
            try {
                await db.collection(collections_1.COLLECTIONS.tenants).where({ id: createdTenantId, landlordOpenId }).remove();
            }
            catch (cleanupError) {
                console.warn('rollback created tenant after lease failure failed', cleanupError);
            }
        }
        throw error;
    }
}
