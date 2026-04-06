"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const bill_repository_1 = require("./shared/repositories/bill-repository");
const runtime_1 = require("./shared/runtime");
const collections_1 = require("./shared/constants/collections");
async function main(event) {
    const db = (0, runtime_1.resolveDb)(event);
    const leases = await (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.leases);
    const lease = leases.find((item) => item.id === event.leaseId);
    if (!lease) {
        throw new Error(`Lease ${event.leaseId} not found.`);
    }
    const section = event.type === 'rent' ? 'rent' : event.type === 'deposit' ? 'deposit' : 'non_rent';
    const dueDate = `${event.monthKey}-01`;
    return (0, bill_repository_1.createManualBill)(db, {
        lease,
        type: event.type,
        section,
        dueDate,
        amount: Number(event.amount || 0),
        itemLabel: event.itemLabel
    }, event);
}
