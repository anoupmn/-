"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const bill_repository_1 = require("./shared/repositories/bill-repository");
const runtime_1 = require("./shared/runtime");
async function main(event) {
    const db = (0, runtime_1.resolveDb)(event);
    return (0, bill_repository_1.markBillReceived)(db, {
        billId: event.billId,
        receivedAt: event.receivedAt,
        receivedAmount: event.receivedAmount
    }, event);
}
