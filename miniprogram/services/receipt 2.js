"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReceipt = createReceipt;
exports.getReceipt = getReceipt;
exports.listReceiptRecords = listReceiptRecords;
exports.listReceiptLeaseOptions = listReceiptLeaseOptions;
exports.exportReceiptPdf = exportReceiptPdf;
exports.deleteReceipt = deleteReceipt;
const cloud_1 = require("./cloud");
function createReceipt(payload) {
    return (0, cloud_1.callCloudFunction)('receipt-create', payload);
}
function getReceipt(payload) {
    return (0, cloud_1.callCloudFunction)('receipt-get', payload);
}
function listReceiptRecords(payload) {
    return (0, cloud_1.callCloudFunction)('receipt-list', payload);
}
function listReceiptLeaseOptions(payload = {}) {
    return (0, cloud_1.callCloudFunction)('receipt-lease-options', payload);
}
function exportReceiptPdf(payload) {
    return (0, cloud_1.callCloudFunction)('receipt-pdf', payload);
}
function deleteReceipt(payload) {
    return (0, cloud_1.callCloudFunction)('receipt-delete', payload);
}
