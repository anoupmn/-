"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const asset_repository_1 = require("./shared/repositories/asset-repository");
const lease_repository_1 = require("./shared/repositories/lease-repository");
const room_repository_1 = require("./shared/repositories/room-repository");
const tenant_repository_1 = require("./shared/repositories/tenant-repository");
const runtime_1 = require("./shared/runtime");
async function main(event) {
    const db = (0, runtime_1.resolveDb)(event);
    const landlordOpenId = (0, runtime_1.resolveLandlordOpenId)(event);
    const { asset, defaultRoom } = await (0, asset_repository_1.createAssetWithDefaultRoomForWholeMode)(db, landlordOpenId, event.asset, event);
    const rooms = asset.rentalMode === 'whole'
        ? [defaultRoom]
        : await Promise.all((event.rooms ?? []).map((room) => (0, room_repository_1.createRoom)(db, landlordOpenId, {
            ...room,
            assetId: asset.id
        }, event)));
    const tenant = await (0, tenant_repository_1.createTenant)(db, landlordOpenId, event.tenant, event);
    const primaryRoom = rooms[0];
    const lease = await (0, lease_repository_1.createLease)(db, landlordOpenId, {
        ...event.lease,
        roomId: primaryRoom.id,
        tenantId: tenant.id
    }, event);
    return {
        mode: 'quick-entry',
        asset,
        rooms,
        tenant,
        lease
    };
}
