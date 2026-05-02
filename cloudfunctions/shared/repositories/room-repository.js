"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRoom = createRoom;
exports.updateRoom = updateRoom;
exports.listRoomsByAsset = listRoomsByAsset;
exports.getRoomDeleteBlockers = getRoomDeleteBlockers;
exports.deleteRoomSafely = deleteRoomSafely;
const collections_1 = require("../constants/collections");
const room_1 = require("../schemas/room");
const runtime_1 = require("../runtime");
async function createRoom(db, landlordOpenId, input, event) {
    const room = room_1.roomSchema.parse({
        id: (0, runtime_1.createId)('room'),
        landlordOpenId,
        ...input,
        createdAt: (0, runtime_1.resolveNow)(event),
        updatedAt: (0, runtime_1.resolveNow)(event)
    });
    await (0, runtime_1.insertRecord)(db, collections_1.COLLECTIONS.rooms, room);
    return room;
}
async function updateRoom(db, roomId, changes, event) {
    return (0, runtime_1.updateRecord)(db, collections_1.COLLECTIONS.rooms, roomId, {
        ...changes,
        updatedAt: (0, runtime_1.resolveNow)(event)
    });
}
async function listRoomsByAsset(db, assetId) {
    const rooms = await (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.rooms);
    return rooms.filter((room) => room.assetId === assetId);
}
async function listRoomRecordsSafely(db, collectionName, roomId, landlordOpenId) {
    try {
        const records = await (0, runtime_1.listAll)(db, collectionName);
        return records.filter((record) => record.roomId === roomId && record.landlordOpenId === landlordOpenId);
    }
    catch {
        return [];
    }
}
async function getRoomDeleteBlockers(db, roomId, landlordOpenId) {
    const room = await (0, runtime_1.findById)(db, collections_1.COLLECTIONS.rooms, roomId);
    if (!room || room.landlordOpenId !== landlordOpenId) {
        throw new Error(`Room ${roomId} not found.`);
    }
    const [leases, bills, receipts, repairs, ownerExpenses] = await Promise.all([
        listRoomRecordsSafely(db, collections_1.COLLECTIONS.leases, roomId, landlordOpenId),
        listRoomRecordsSafely(db, collections_1.COLLECTIONS.bills, roomId, landlordOpenId),
        listRoomRecordsSafely(db, collections_1.COLLECTIONS.receipts, roomId, landlordOpenId),
        listRoomRecordsSafely(db, collections_1.COLLECTIONS.repairRecords, roomId, landlordOpenId),
        listRoomRecordsSafely(db, collections_1.COLLECTIONS.ownerExpenses, roomId, landlordOpenId)
    ]);
    const blockers = [];
    if (room.isWholeUnitDefault) {
        blockers.push({ code: 'whole_unit_default', count: 1 });
    }
    if (leases.length > 0) {
        blockers.push({ code: 'lease', count: leases.length });
    }
    if (bills.length > 0) {
        blockers.push({ code: 'bill', count: bills.length });
    }
    if (receipts.length > 0) {
        blockers.push({ code: 'receipt', count: receipts.length });
    }
    if (repairs.length > 0) {
        blockers.push({ code: 'repair_record', count: repairs.length });
    }
    if (ownerExpenses.length > 0) {
        blockers.push({ code: 'owner_expense', count: ownerExpenses.length });
    }
    return blockers;
}
async function deleteRoomSafely(db, roomId, landlordOpenId, options = {}) {
    const room = await (0, runtime_1.findById)(db, collections_1.COLLECTIONS.rooms, roomId);
    if (!room || room.landlordOpenId !== landlordOpenId) {
        throw new Error(`Room ${roomId} not found.`);
    }
    const blockers = await getRoomDeleteBlockers(db, roomId, landlordOpenId);
    const summary = {
        canDelete: blockers.length === 0,
        blockers
    };
    if (!summary.canDelete || options.confirm !== true) {
        return {
            ...summary,
            deleted: false
        };
    }
    await (0, runtime_1.removeRecordsByQuery)(db, collections_1.COLLECTIONS.rooms, { id: roomId, landlordOpenId });
    return {
        ...summary,
        deleted: true
    };
}
