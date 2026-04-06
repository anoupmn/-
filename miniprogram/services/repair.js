"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveRepairRecord = saveRepairRecord;
const cloud_1 = require("./cloud");
function saveRepairRecord(payload) {
    return (0, cloud_1.callCloudFunction)('repair-record-save', payload);
}
