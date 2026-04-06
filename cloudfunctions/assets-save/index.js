"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const asset_repository_1 = require("../shared/repositories/asset-repository");
const runtime_1 = require("../shared/runtime");
async function main(event) {
    const db = (0, runtime_1.resolveDb)(event);
    if (event.assetId) {
        return {
            asset: await (0, asset_repository_1.updateAsset)(db, event.assetId, event.asset, event),
            defaultRoom: null
        };
    }
    return (0, asset_repository_1.createAssetWithDefaultRoomForWholeMode)(db, (0, runtime_1.resolveLandlordOpenId)(event), event.asset, event);
}
