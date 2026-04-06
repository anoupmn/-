"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTenant = createTenant;
exports.updateTenant = updateTenant;
exports.listTenants = listTenants;
const collections_1 = require("../constants/collections");
const tenant_1 = require("../schemas/tenant");
const runtime_1 = require("../runtime");
async function createTenant(db, landlordOpenId, input, event) {
    const tenant = tenant_1.tenantSchema.parse({
        id: (0, runtime_1.createId)('tenant'),
        landlordOpenId,
        ...input,
        createdAt: (0, runtime_1.resolveNow)(event),
        updatedAt: (0, runtime_1.resolveNow)(event)
    });
    await (0, runtime_1.insertRecord)(db, collections_1.COLLECTIONS.tenants, tenant);
    return tenant;
}
async function updateTenant(db, tenantId, changes, event) {
    return (0, runtime_1.updateRecord)(db, collections_1.COLLECTIONS.tenants, tenantId, {
        ...changes,
        updatedAt: (0, runtime_1.resolveNow)(event)
    });
}
async function listTenants(db) {
    return (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.tenants);
}
