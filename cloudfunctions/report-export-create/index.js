"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildReportFileName = buildReportFileName;
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
function safeFileSegment(value) {
    return (value
        .trim()
        .replace(/[\\/:*?"<>|\s]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40) || '全部房源');
}
function compactTimestamp(value) {
    return value.replace(/\D/g, '').slice(0, 14) || String(Date.now());
}
function buildReportFileName(month, scopeLabel, generatedAt, exportId) {
    const shortId = exportId.replace(/^report_export_/, '').slice(0, 8);
    return `收租吧-${month}-${safeFileSegment(scopeLabel)}-月度经营明细-${compactTimestamp(generatedAt)}-${shortId}.xlsx`;
}
async function main(event) {
    const db = (0, runtime_1.resolveDb)(event);
    const landlordOpenId = (0, runtime_1.resolveLandlordOpenId)(event);
    const generatedAt = (0, runtime_1.resolveNow)(event);
    const exportId = (0, runtime_1.createId)('report_export');
    const request = report_export_1.reportExportRequestSchema.parse({
        month: event.month,
        assetId: event.assetId,
        roomId: event.roomId
    });
    const workbook = await (0, report_export_repository_1.buildMonthlyReportData)(db, landlordOpenId, request);
    const summary = (0, report_export_repository_1.summarizeReportWorkbook)(workbook);
    const scopeLabel = await (0, report_export_repository_1.resolveReportScopeLabel)(db, landlordOpenId, request);
    const fileName = buildReportFileName(request.month, scopeLabel, generatedAt, exportId);
    const buffer = buildWorkbookBuffer(workbook);
    const fileID = await uploadWorkbook(fileName, buffer, Boolean(event.__mockDb));
    await (0, report_export_repository_1.saveReportExportMetadata)(db, landlordOpenId, request, fileName, scopeLabel, [...report_export_repository_1.REPORT_SHEET_NAMES], summary, event, fileID, exportId);
    return {
        fileID,
        fileName,
        scopeLabel,
        sheetNames: [...report_export_repository_1.REPORT_SHEET_NAMES],
        summary,
        workbook,
        generatedAt
    };
}
