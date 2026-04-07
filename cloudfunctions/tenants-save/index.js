"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const tenant_repository_1 = require("./shared/repositories/tenant-repository");
const collections_1 = require("./shared/constants/collections");
const runtime_1 = require("./shared/runtime");
async function main(event) {
    const db = (0, runtime_1.resolveDb)(event);
    const landlordOpenId = (0, runtime_1.resolveLandlordOpenId)(event);
    if (event.tenantId) {
        const tenants = await (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.tenants);
        const ownedTenant = tenants.find((item) => item.id === event.tenantId && item.landlordOpenId === landlordOpenId);
        if (!ownedTenant) {
            throw new Error(`Tenant ${event.tenantId} not found.`);
        }
        return (0, tenant_repository_1.updateTenant)(db, event.tenantId, event.tenant, event);
    }
    return (0, tenant_repository_1.createTenant)(db, landlordOpenId, event.tenant, event);
}
