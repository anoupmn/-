"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const lease_repository_1 = require("../shared/repositories/lease-repository");
const runtime_1 = require("../shared/runtime");
async function main(event) {
    const db = (0, runtime_1.resolveDb)(event);
    if (event.leaseId) {
        return (0, lease_repository_1.updateLease)(db, event.leaseId, event.lease, event);
    }
    return (0, lease_repository_1.createLease)(db, (0, runtime_1.resolveLandlordOpenId)(event), event.lease, event);
}
