"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const receipt_repository_1 = require("./shared/repositories/receipt-repository");
const runtime_1 = require("./shared/runtime");
async function main(event) {
    const db = (0, runtime_1.resolveDb)(event);
    const landlordOpenId = (0, runtime_1.resolveLandlordOpenId)(event);
    return (0, receipt_repository_1.createReceipt)(db, landlordOpenId, {
        billIds: event.billIds,
        month: event.month,
        leaseId: event.leaseId,
        roomId: event.roomId,
        collectorName: event.collectorName,
        note: event.note,
        reissueFromReceiptId: event.reissueFromReceiptId
    }, event);
}
