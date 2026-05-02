"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const report_export_repository_1 = require("./shared/repositories/report-export-repository");
const runtime_1 = require("./shared/runtime");
async function main(event = {}) {
    const db = (0, runtime_1.resolveDb)(event);
    const landlordOpenId = (0, runtime_1.resolveLandlordOpenId)(event);
    return {
        exports: await (0, report_export_repository_1.listReportExports)(db, landlordOpenId)
    };
}
