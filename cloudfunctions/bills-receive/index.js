"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const bill_repository_1 = require("./shared/repositories/bill-repository");
const collections_1 = require("./shared/constants/collections");
const runtime_1 = require("./shared/runtime");
async function main(event) {
    const db = (0, runtime_1.resolveDb)(event);
    const landlordOpenId = (0, runtime_1.resolveLandlordOpenId)(event);
    const bills = await (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.bills);
    const ownedBill = bills.find((item) => item.id === event.billId && item.landlordOpenId === landlordOpenId);
    if (!ownedBill) {
        throw new Error(`Bill ${event.billId} not found.`);
    }
    return (0, bill_repository_1.markBillReceived)(db, {
        billId: event.billId,
        receivedAt: event.receivedAt,
        receivedAmount: event.receivedAmount
    }, event);
}
