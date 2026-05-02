"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMonthlyReportExport = createMonthlyReportExport;
exports.listReportExports = listReportExports;
exports.deleteReportExport = deleteReportExport;
const cloud_1 = require("./cloud");
function createMonthlyReportExport(payload) {
    return (0, cloud_1.callCloudFunction)('report-export-create', payload);
}
function listReportExports() {
    return (0, cloud_1.callCloudFunction)('report-export-list');
}
function deleteReportExport(payload) {
    return (0, cloud_1.callCloudFunction)('report-export-delete', payload);
}
