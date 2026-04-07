"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const room_repository_1 = require("./shared/repositories/room-repository");
const collections_1 = require("./shared/constants/collections");
const runtime_1 = require("./shared/runtime");
async function main(event) {
    const db = (0, runtime_1.resolveDb)(event);
    const landlordOpenId = (0, runtime_1.resolveLandlordOpenId)(event);
    const assets = await (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.assets);
    const targetAsset = assets.find((item) => item.id === event.room.assetId && item.landlordOpenId === landlordOpenId);
    if (!targetAsset) {
        throw new Error(`Asset ${event.room.assetId} not found.`);
    }
    if (event.roomId) {
        const rooms = await (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.rooms);
        const ownedRoom = rooms.find((item) => item.id === event.roomId && item.landlordOpenId === landlordOpenId);
        if (!ownedRoom) {
            throw new Error(`Room ${event.roomId} not found.`);
        }
        return (0, room_repository_1.updateRoom)(db, event.roomId, event.room, event);
    }
    return (0, room_repository_1.createRoom)(db, landlordOpenId, event.room, event);
}
