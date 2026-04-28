"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAssetWithDefaultRoomForWholeMode = createAssetWithDefaultRoomForWholeMode;
exports.updateAsset = updateAsset;
exports.listAssets = listAssets;
const collections_1 = require("../constants/collections");
const asset_1 = require("../schemas/asset");
const room_1 = require("../schemas/room");
const runtime_1 = require("../runtime");
function createWholeUnitDefaultRoom(asset, now) {
    return room_1.roomSchema.parse({
        id: (0, runtime_1.createId)('room'),
        landlordOpenId: asset.landlordOpenId,
        assetId: asset.id,
        name: `${asset.name} 整租单元`,
        note: '',
        isWholeUnitDefault: true,
        createdAt: now,
        updatedAt: now
    });
}
async function createAssetWithDefaultRoomForWholeMode(db, landlordOpenId, input, event) {
    const now = (0, runtime_1.resolveNow)(event);
    const asset = asset_1.assetSchema.parse({
        id: (0, runtime_1.createId)('asset'),
        landlordOpenId,
        ...input,
        createdAt: now,
        updatedAt: now
    });
    await (0, runtime_1.insertRecord)(db, collections_1.COLLECTIONS.assets, asset);
    let defaultRoom = null;
    if (asset.rentalMode === 'whole') {
        defaultRoom = createWholeUnitDefaultRoom(asset, now);
        await (0, runtime_1.insertRecord)(db, collections_1.COLLECTIONS.rooms, defaultRoom);
    }
    return {
        asset,
        defaultRoom
    };
}
async function updateAsset(db, assetId, changes, event) {
    return (0, runtime_1.updateRecord)(db, collections_1.COLLECTIONS.assets, assetId, {
        ...changes,
        updatedAt: (0, runtime_1.resolveNow)(event)
    });
}
async function listAssets(db) {
    return (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.assets);
}
