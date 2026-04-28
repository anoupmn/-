"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantInputSchema = exports.tenantSchema = void 0;
const zod_1 = require("zod");
exports.tenantSchema = zod_1.z.object({
    id: zod_1.z.string(),
    landlordOpenId: zod_1.z.string(),
    name: zod_1.z.string().min(1),
    phone: zod_1.z.string().optional().default(''),
    note: zod_1.z.string().optional().default(''),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string()
});
exports.tenantInputSchema = exports.tenantSchema.omit({
    id: true,
    landlordOpenId: true,
    createdAt: true,
    updatedAt: true
});
