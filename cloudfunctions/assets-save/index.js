"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const asset_repository_1 = require("./shared/repositories/asset-repository");
const collections_1 = require("./shared/constants/collections");
const runtime_1 = require("./shared/runtime");
async function main(event) {
    const db = (0, runtime_1.resolveDb)(event);
    const landlordOpenId = (0, runtime_1.resolveLandlordOpenId)(event);
    if (event.assetId) {
        const assets = await (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.assets);
        const ownedAsset = assets.find((item) => item.id === event.assetId && item.landlordOpenId === landlordOpenId);
        if (!ownedAsset) {
            throw new Error(`Asset ${event.assetId} not found.`);
        }
        return {
            asset: await (0, asset_repository_1.updateAsset)(db, event.assetId, event.asset, event),
            defaultRoom: null
        };
    }
    return (0, asset_repository_1.createAssetWithDefaultRoomForWholeMode)(db, landlordOpenId, event.asset, event);
}
