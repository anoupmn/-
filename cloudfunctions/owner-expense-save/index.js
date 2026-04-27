"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const collections_1 = require("./shared/constants/collections");
const repairs_1 = require("./shared/constants/repairs");
const owner_expense_repository_1 = require("./shared/repositories/owner-expense-repository");
const owner_expense_1 = require("./shared/schemas/owner-expense");
const runtime_1 = require("./shared/runtime");
function isValidRepairCategory(value) {
    if (!value) {
        return true;
    }
    return Object.values(repairs_1.REPAIR_CATEGORIES).includes(value);
}
async function main(event) {
    const expenseType = owner_expense_1.ownerExpenseTypeSchema.parse(event.expenseType);
    if (!isValidRepairCategory(event.repairCategory)) {
        throw new Error(`Invalid repair category: ${event.repairCategory}`);
    }
    const db = (0, runtime_1.resolveDb)(event);
    const landlordOpenId = (0, runtime_1.resolveLandlordOpenId)(event);
    const expense = await (0, owner_expense_repository_1.createOwnerExpense)(db, {
        landlordOpenId,
        assetId: event.assetId,
        roomId: event.roomId,
        expenseType,
        amount: event.amount ?? null,
        note: event.note,
        occurredAt: event.occurredAt,
        repairCategory: event.repairCategory
    }, event);
    return {
        collectionName: collections_1.COLLECTIONS.ownerExpenses,
        expense
    };
}
