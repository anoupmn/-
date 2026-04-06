"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assetInputSchema = exports.assetSchema = void 0;
const zod_1 = require("zod");
const statuses_1 = require("../constants/statuses");
exports.assetSchema = zod_1.z.object({
    id: zod_1.z.string(),
    landlordOpenId: zod_1.z.string(),
    name: zod_1.z.string().min(1),
    rentalMode: zod_1.z.enum(statuses_1.RENTAL_MODES),
    address: zod_1.z.string().optional().default(''),
    note: zod_1.z.string().optional().default(''),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string()
});
exports.assetInputSchema = exports.assetSchema.omit({
    id: true,
    landlordOpenId: true,
    createdAt: true,
    updatedAt: true
});
