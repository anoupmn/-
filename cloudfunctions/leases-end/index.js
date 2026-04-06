"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const lease_repository_1 = require("./shared/repositories/lease-repository");
const runtime_1 = require("./shared/runtime");
async function main(event) {
    return (0, lease_repository_1.endLease)((0, runtime_1.resolveDb)(event), event.leaseId, event);
}
