"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const collections_1 = require("./shared/constants/collections");
const repairs_1 = require("./shared/constants/repairs");
const repair_record_repository_1 = require("./shared/repositories/repair-record-repository");
const runtime_1 = require("./shared/runtime");
function isValidCategory(value) {
    return Object.values(repairs_1.REPAIR_CATEGORIES).includes(value);
}
async function main(event) {
    if (!isValidCategory(event.category)) {
        throw new Error(`Invalid repair category: ${event.category}`);
    }
    const db = (0, runtime_1.resolveDb)(event);
    const landlordOpenId = (0, runtime_1.resolveLandlordOpenId)(event);
    const record = await (0, repair_record_repository_1.createRepairRecord)(db, {
        landlordOpenId,
        roomId: event.roomId,
        assetId: event.assetId,
        category: event.category,
        note: event.note,
        occurredAt: event.occurredAt
    }, event);
    return {
        collectionName: collections_1.COLLECTIONS.repairRecords,
        record
    };
}
