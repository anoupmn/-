"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveOwnerExpense = saveOwnerExpense;
const cloud_1 = require("./cloud");
function saveOwnerExpense(payload) {
    return (0, cloud_1.callCloudFunction)('owner-expense-save', payload);
}
