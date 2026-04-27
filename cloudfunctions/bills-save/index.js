"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const bill_repository_1 = require("./shared/repositories/bill-repository");
const runtime_1 = require("./shared/runtime");
const collections_1 = require("./shared/constants/collections");
async function main(event) {
    const db = (0, runtime_1.resolveDb)(event);
    const landlordOpenId = (0, runtime_1.resolveLandlordOpenId)(event);
    const mode = event.mode ?? (event.billId ? 'delete' : 'create');
    if (mode === 'delete') {
        const billId = String(event.billId || '').trim();
        if (!billId) {
            throw new Error('billId is required when deleting manual bill.');
        }
        const bills = await (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.bills);
        const targetBill = bills.find((item) => item.id === billId && item.landlordOpenId === landlordOpenId);
        if (!targetBill) {
            throw new Error(`Bill ${billId} not found.`);
        }
        if (targetBill.source !== 'manual') {
            throw new Error('Only manual bills can be deleted.');
        }
        await db.collection(collections_1.COLLECTIONS.bills).where({ id: billId, landlordOpenId }).remove();
        return {
            deletedBillId: billId
        };
    }
    const leaseId = String(event.leaseId || '').trim();
    const monthKey = String(event.monthKey || '').trim();
    const type = event.type;
    if (!leaseId || !monthKey || !type) {
        throw new Error('leaseId, monthKey and type are required.');
    }
    const leases = await (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.leases);
    const lease = leases.find((item) => item.id === leaseId && item.landlordOpenId === landlordOpenId);
    if (!lease) {
        throw new Error(`Lease ${leaseId} not found.`);
    }
    const section = event.type === 'rent' ? 'rent' : event.type === 'deposit' ? 'deposit' : 'non_rent';
    const dueDate = `${monthKey}-01`;
    if (type === 'water' || type === 'electricity') {
        return (0, bill_repository_1.createMeterBill)(db, {
            lease,
            type,
            dueDate,
            previousReading: Number(event.previousReading),
            currentReading: Number(event.currentReading),
            unitPrice: Number(event.unitPrice),
            note: event.note
        }, event);
    }
    return (0, bill_repository_1.createManualBill)(db, {
        lease,
        type,
        section,
        dueDate,
        amount: Number(event.amount || 0),
        itemLabel: event.itemLabel,
        note: event.note
    }, event);
}
