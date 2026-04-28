"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listOwnerExpenses = listOwnerExpenses;
exports.listOwnerExpensesByRoom = listOwnerExpensesByRoom;
exports.buildOwnerExpenseSummary = buildOwnerExpenseSummary;
exports.createOwnerExpense = createOwnerExpense;
const collections_1 = require("../constants/collections");
const repairs_1 = require("../constants/repairs");
const owner_expense_1 = require("../schemas/owner-expense");
const runtime_1 = require("../runtime");
const repair_record_repository_1 = require("./repair-record-repository");
function getDateKey(raw) {
    return raw.slice(0, 10);
}
function normalizeOccurredAt(inputOccurredAt, event) {
    return getDateKey(inputOccurredAt ?? (0, runtime_1.resolveNow)(event));
}
function isWithinRange(dateKey, startDate, endDate) {
    return dateKey >= startDate && dateKey <= endDate;
}
function findLeaseByDate(leases, occurredAt) {
    return (leases
        .filter((item) => isWithinRange(occurredAt, item.startDate, item.endDate))
        .sort((a, b) => b.startDate.localeCompare(a.startDate))[0] ?? null);
}
async function listOwnerExpenses(db) {
    return (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.ownerExpenses);
}
async function listOwnerExpensesByRoom(db, roomId, landlordOpenId) {
    const expenses = await listOwnerExpenses(db);
    return expenses
        .filter((item) => item.roomId === roomId)
        .filter((item) => !landlordOpenId || item.landlordOpenId === landlordOpenId)
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.updatedAt.localeCompare(a.updatedAt));
}
function buildOwnerExpenseSummary(expenses) {
    const totalAmount = expenses.reduce((sum, item) => sum + (item.amount ?? 0), 0);
    const amountByType = expenses.reduce((acc, item) => ({
        ...acc,
        [item.expenseType]: acc[item.expenseType] + (item.amount ?? 0)
    }), {
        repair: 0,
        cleaning: 0,
        caretaking: 0,
        labor: 0,
        other: 0
    });
    return {
        count: expenses.length,
        totalAmount,
        amountByType
    };
}
async function createOwnerExpense(db, rawInput, event) {
    const input = owner_expense_1.ownerExpenseInputSchema.parse(rawInput);
    const occurredAt = normalizeOccurredAt(input.occurredAt, event);
    const now = (0, runtime_1.resolveNow)(event);
    const [assets, rooms, leases] = await Promise.all([
        (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.assets),
        (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.rooms),
        (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.leases)
    ]);
    const room = input.roomId
        ? rooms.find((item) => item.id === input.roomId && item.landlordOpenId === rawInput.landlordOpenId)
        : null;
    if (input.roomId && !room) {
        throw new Error(`Room ${input.roomId} not found.`);
    }
    const assetId = room?.assetId ?? input.assetId;
    if (!assetId) {
        throw new Error('assetId or roomId is required.');
    }
    const asset = assets.find((item) => item.id === assetId && item.landlordOpenId === rawInput.landlordOpenId);
    if (!asset) {
        throw new Error(`Asset ${assetId} not found.`);
    }
    const lease = room
        ? findLeaseByDate(leases.filter((item) => item.roomId === room.id && item.landlordOpenId === rawInput.landlordOpenId), occurredAt)
        : null;
    let repairRecordId = null;
    if (input.expenseType === 'repair') {
        const note = String(input.note || '').trim();
        if (!note) {
            throw new Error('Repair expense note is required.');
        }
        const repairRecord = await (0, repair_record_repository_1.createRepairRecord)(db, {
            landlordOpenId: rawInput.landlordOpenId,
            roomId: room?.id,
            assetId,
            category: input.repairCategory ?? repairs_1.REPAIR_CATEGORIES.other,
            note,
            occurredAt
        }, event);
        repairRecordId = repairRecord.id;
    }
    const expense = owner_expense_1.ownerExpenseSchema.parse({
        id: (0, runtime_1.createId)('expense'),
        landlordOpenId: rawInput.landlordOpenId,
        assetId,
        roomId: room?.id ?? null,
        leaseId: lease?.id ?? null,
        tenantId: lease?.tenantId ?? null,
        repairRecordId,
        expenseType: input.expenseType,
        amount: input.amount ?? null,
        note: String(input.note || '').trim(),
        occurredAt,
        monthKey: occurredAt.slice(0, 7),
        createdAt: now,
        updatedAt: now
    });
    await (0, runtime_1.insertRecord)(db, collections_1.COLLECTIONS.ownerExpenses, expense);
    return expense;
}
