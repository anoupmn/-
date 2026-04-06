"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roomInputSchema = exports.roomSchema = void 0;
const zod_1 = require("zod");
exports.roomSchema = zod_1.z.object({
    id: zod_1.z.string(),
    landlordOpenId: zod_1.z.string(),
    assetId: zod_1.z.string(),
    name: zod_1.z.string().min(1),
    note: zod_1.z.string().optional().default(''),
    isWholeUnitDefault: zod_1.z.boolean(),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string()
});
exports.roomInputSchema = exports.roomSchema.omit({
    id: true,
    landlordOpenId: true,
    createdAt: true,
    updatedAt: true
});
