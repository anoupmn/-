"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMonthlyReportExport = createMonthlyReportExport;
const cloud_1 = require("./cloud");
function createMonthlyReportExport(payload) {
    return (0, cloud_1.callCloudFunction)('report-export-create', payload);
}
