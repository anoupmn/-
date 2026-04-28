"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReceipt = createReceipt;
exports.getReceipt = getReceipt;
exports.voidReceipt = voidReceipt;
const cloud_1 = require("./cloud");
function createReceipt(payload) {
    return (0, cloud_1.callCloudFunction)('receipt-create', payload);
}
function getReceipt(payload) {
    return (0, cloud_1.callCloudFunction)('receipt-get', payload);
}
function voidReceipt(payload) {
    return (0, cloud_1.callCloudFunction)('receipt-void', payload);
}
