"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAbnormalFlags = listAbnormalFlags;
exports.saveAbnormalFlag = saveAbnormalFlag;
exports.syncRepairFrequencyAbnormalFlags = syncRepairFrequencyAbnormalFlags;
const collections_1 = require("../constants/collections");
const abnormal_flag_1 = require("../schemas/abnormal-flag");
const repair_record_repository_1 = require("./repair-record-repository");
const runtime_1 = require("../runtime");
function normalizeSource(value) {
    return value ?? 'manual';
}
async function listAbnormalFlags(db, landlordOpenId) {
    const records = await (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.abnormalFlags);
    const normalized = records.map((item) => abnormal_flag_1.abnormalFlagSchema.parse({
        ...item,
        source: normalizeSource(item.source)
    }));
    return landlordOpenId ? normalized.filter((item) => item.landlordOpenId === landlordOpenId) : normalized;
}
async function saveAbnormalFlag(db, input, event) {
    const now = (0, runtime_1.resolveNow)(event);
    const source = normalizeSource(input.source);
    const flags = await listAbnormalFlags(db);
    const current = flags.find((item) => item.roomId === input.roomId &&
        item.landlordOpenId === input.landlordOpenId &&
        normalizeSource(item.source) === source) ?? null;
    if (current) {
        const next = abnormal_flag_1.abnormalFlagSchema.parse({
            ...current,
            source,
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
        source,
        active: input.active,
        reason: input.reason,
        createdAt: now,
        updatedAt: now,
        clearedAt: input.active ? null : now
    });
    await (0, runtime_1.insertRecord)(db, collections_1.COLLECTIONS.abnormalFlags, created);
    return created;
}
async function syncRepairFrequencyAbnormalFlags(db, input, event) {
    const landlords = Array.from(new Set(input.rooms.map((room) => room.landlordOpenId)));
    for (const landlordOpenId of landlords) {
        const landlordRooms = input.rooms.filter((room) => room.landlordOpenId === landlordOpenId);
        const landlordLeases = input.leases.filter((lease) => lease.landlordOpenId === landlordOpenId);
        const landlordRepairs = input.repairs.filter((repair) => repair.landlordOpenId === landlordOpenId);
        for (const room of landlordRooms) {
            const stats = (0, repair_record_repository_1.buildRoomRepairStats)({
                roomId: room.id,
                leases: landlordLeases,
                records: landlordRepairs,
                now: input.now
            });
            await saveAbnormalFlag(db, {
                landlordOpenId,
                roomId: room.id,
                source: 'repair_frequency',
                reason: stats.abnormal.reason,
                active: stats.abnormal.active
            }, event);
        }
    }
}
