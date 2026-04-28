"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const report_export_repository_1 = require("./shared/repositories/report-export-repository");
const report_export_1 = require("./shared/schemas/report-export");
const runtime_1 = require("./shared/runtime");
const cloudSdk = (() => {
    try {
        return require('wx-server-sdk');
    }
    catch {
        return null;
    }
})();
function buildWorkbookBuffer(workbookData) {
    let XLSX;
    try {
        XLSX = require('xlsx');
    }
    catch {
        return Buffer.from(JSON.stringify(workbookData), 'utf8');
    }
    const workbook = XLSX.utils.book_new();
    report_export_repository_1.REPORT_SHEET_NAMES.forEach((sheetName) => {
        const rows = workbookData[sheetName] ?? [];
        const sheet = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
    });
    return XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'buffer'
    });
}
async function uploadWorkbook(fileName, buffer, shouldSkipUpload) {
    if (shouldSkipUpload || !cloudSdk?.uploadFile) {
        return undefined;
    }
    const result = await cloudSdk.uploadFile({
        cloudPath: `report_exports/${fileName}`,
        fileContent: buffer
    });
    return result.fileID;
}
async function main(event) {
    const db = (0, runtime_1.resolveDb)(event);
    const landlordOpenId = (0, runtime_1.resolveLandlordOpenId)(event);
    const request = report_export_1.reportExportRequestSchema.parse({
        month: event.month,
        assetId: event.assetId,
        roomId: event.roomId
    });
    const workbook = await (0, report_export_repository_1.buildMonthlyReportData)(db, landlordOpenId, request);
    const summary = (0, report_export_repository_1.summarizeReportWorkbook)(workbook);
    const fileName = `收租吧-${request.month}-月度经营明细.xlsx`;
    const buffer = buildWorkbookBuffer(workbook);
    const fileID = await uploadWorkbook(fileName, buffer, Boolean(event.__mockDb));
    await (0, report_export_repository_1.saveReportExportMetadata)(db, landlordOpenId, request, fileName, [...report_export_repository_1.REPORT_SHEET_NAMES], summary, event, fileID);
    return {
        fileID,
        fileName,
        sheetNames: [...report_export_repository_1.REPORT_SHEET_NAMES],
        summary,
        workbook,
        generatedAt: (0, runtime_1.resolveNow)(event)
    };
}
