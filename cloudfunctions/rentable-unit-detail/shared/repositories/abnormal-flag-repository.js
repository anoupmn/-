"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAbnormalFlags = listAbnormalFlags;
exports.saveAbnormalFlag = saveAbnormalFlag;
const collections_1 = require("../constants/collections");
const abnormal_flag_1 = require("../schemas/abnormal-flag");
const runtime_1 = require("../runtime");
async function listAbnormalFlags(db) {
    return (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.abnormalFlags);
}
async function saveAbnormalFlag(db, input, event) {
    const now = (0, runtime_1.resolveNow)(event);
    const flags = await listAbnormalFlags(db);
    const current = flags.find((item) => item.roomId === input.roomId && item.landlordOpenId === input.landlordOpenId) ?? null;
    if (current) {
        const next = abnormal_flag_1.abnormalFlagSchema.parse({
            ...current,
            active: input.active,
            reason: input.active ? input.reason : current.reason,
            updatedAt: now,
            clearedAt: input.active ? null : now
        });
        await db.collection(collections_1.COLLECTIONS.abnormalFlags).doc(current.id).update({ data: next });
        return next;
    }
    const created = abnormal_flag_1.abnormalFlagSchema.parse({
        id: (0, runtime_1.createId)('abnormal'),
        landlordOpenId: input.landlordOpenId,
        roomId: input.roomId,
        active: input.active,
        reason: input.reason,
        createdAt: now,
        updatedAt: now,
        clearedAt: input.active ? null : now
    });
    await (0, runtime_1.insertRecord)(db, collections_1.COLLECTIONS.abnormalFlags, created);
    return created;
}
