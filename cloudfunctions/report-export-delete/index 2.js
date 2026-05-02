"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const report_export_repository_1 = require("./shared/repositories/report-export-repository");
const runtime_1 = require("./shared/runtime");
const cloudSdk = (() => {
    try {
        return require('wx-server-sdk');
    }
    catch {
        return null;
    }
})();
async function main(event) {
    const db = (0, runtime_1.resolveDb)(event);
    const landlordOpenId = (0, runtime_1.resolveLandlordOpenId)(event);
    const record = await (0, report_export_repository_1.deleteReportExport)(db, landlordOpenId, event.exportId);
    if (record.fileID && !event.__mockDb && cloudSdk?.deleteFile) {
        await cloudSdk.deleteFile({
            fileList: [record.fileID]
        });
    }
    return {
        deleted: true,
        exportId: record.id
    };
}
