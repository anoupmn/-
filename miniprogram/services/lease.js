"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveLease = saveLease;
exports.endLease = endLease;
exports.deleteLease = deleteLease;
const cloud_1 = require("./cloud");
function saveLease(payload) {
    return (0, cloud_1.callCloudFunction)('leases-save', payload);
}
function endLease(payload) {
    return (0, cloud_1.callCloudFunction)('leases-end', payload);
}
function deleteLease(payload) {
    return (0, cloud_1.callCloudFunction)('leases-delete', payload);
}
