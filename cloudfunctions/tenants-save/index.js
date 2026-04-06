"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const tenant_repository_1 = require("./shared/repositories/tenant-repository");
const runtime_1 = require("./shared/runtime");
async function main(event) {
    const db = (0, runtime_1.resolveDb)(event);
    if (event.tenantId) {
        return (0, tenant_repository_1.updateTenant)(db, event.tenantId, event.tenant, event);
    }
    return (0, tenant_repository_1.createTenant)(db, (0, runtime_1.resolveLandlordOpenId)(event), event.tenant, event);
}
