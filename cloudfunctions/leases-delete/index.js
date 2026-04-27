"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const lease_repository_1 = require("./shared/repositories/lease-repository");
const runtime_1 = require("./shared/runtime");
async function main(event) {
    const leaseId = String(event.leaseId || '').trim();
    if (!leaseId) {
        throw new Error('leaseId is required.');
    }
    const db = (0, runtime_1.resolveDb)(event);
    const landlordOpenId = (0, runtime_1.resolveLandlordOpenId)(event);
    const mode = event.mode ?? 'check';
    return (0, lease_repository_1.deleteLeaseSafely)(db, leaseId, landlordOpenId, {
        confirm: mode === 'delete' && event.confirm === true
    });
}
