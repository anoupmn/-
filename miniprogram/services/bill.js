"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.receiveBill = receiveBill;
exports.saveBill = saveBill;
exports.deleteBill = deleteBill;
const cloud_1 = require("./cloud");
function receiveBill(payload) {
    return (0, cloud_1.callCloudFunction)('bills-receive', payload);
}
function saveBill(payload) {
    return (0, cloud_1.callCloudFunction)('bills-save', payload);
}
function deleteBill(payload) {
    return (0, cloud_1.callCloudFunction)('bills-save', {
        mode: 'delete',
        ...payload
    });
}
