"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportExportMetadataSchema = exports.reportExportRequestSchema = void 0;
const zod_1 = require("zod");
const monthSchema = zod_1.z.string().regex(/^\d{4}-\d{2}$/);
exports.reportExportRequestSchema = zod_1.z.object({
    month: monthSchema,
    assetId: zod_1.z.string().optional(),
    roomId: zod_1.z.string().optional()
});
exports.reportExportMetadataSchema = zod_1.z.object({
    id: zod_1.z.string(),
    landlordOpenId: zod_1.z.string(),
    month: monthSchema,
    assetId: zod_1.z.string().nullable(),
    roomId: zod_1.z.string().nullable(),
    scopeLabel: zod_1.z.string().default('全部房源'),
    fileID: zod_1.z.string().optional(),
    fileName: zod_1.z.string(),
    sheetNames: zod_1.z.array(zod_1.z.string()),
    summary: zod_1.z.object({
        roomCount: zod_1.z.number().int().nonnegative(),
        billCount: zod_1.z.number().int().nonnegative(),
        ownerExpenseCount: zod_1.z.number().int().nonnegative(),
        tenantIncomeTotal: zod_1.z.number().nonnegative(),
        receivedTotal: zod_1.z.number().nonnegative(),
        unpaidTotal: zod_1.z.number().nonnegative(),
        ownerExpenseTotal: zod_1.z.number().nonnegative()
    }),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string()
});
