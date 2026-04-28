"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRoom = createRoom;
exports.updateRoom = updateRoom;
exports.listRoomsByAsset = listRoomsByAsset;
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
