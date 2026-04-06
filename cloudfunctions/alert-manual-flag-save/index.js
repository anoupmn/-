"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const abnormal_flag_repository_1 = require("./shared/repositories/abnormal-flag-repository");
const collections_1 = require("./shared/constants/collections");
const runtime_1 = require("./shared/runtime");
async function main(event) {
    const db = (0, runtime_1.resolveDb)(event);
    const landlordOpenId = (0, runtime_1.resolveLandlordOpenId)(event);
    const flag = await (0, abnormal_flag_repository_1.saveAbnormalFlag)(db, {
        landlordOpenId,
        roomId: event.roomId,
        source: 'manual',
        reason: event.reason,
        active: event.active
    }, event);
    return {
        collectionName: collections_1.COLLECTIONS.abnormalFlags,
        flag
    };
}
