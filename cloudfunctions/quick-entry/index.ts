import { createAssetWithDefaultRoomForWholeMode } from './shared/repositories/asset-repository';
import { createLease } from './shared/repositories/lease-repository';
import { createRoom } from './shared/repositories/room-repository';
import { createTenant } from './shared/repositories/tenant-repository';
import { resolveDb, resolveLandlordOpenId, type CloudEventBase } from './shared/runtime';
import type { AssetInput } from './shared/schemas/asset';
import type { LeaseInput } from './shared/schemas/lease';
import type { RoomInput } from './shared/schemas/room';
import type { TenantInput } from './shared/schemas/tenant';

export interface QuickEntryEvent extends CloudEventBase {
  mode: 'quick-entry';
  asset: AssetInput;
  rooms?: RoomInput[];
  tenant: TenantInput;
  lease: Omit<LeaseInput, 'roomId' | 'tenantId'>;
}

export async function main(event: QuickEntryEvent) {
  const db = resolveDb(event);
  const landlordOpenId = resolveLandlordOpenId(event);
  const { asset, defaultRoom } = await createAssetWithDefaultRoomForWholeMode(db, landlordOpenId, event.asset, event);

  const rooms =
    asset.rentalMode === 'whole'
      ? [defaultRoom!]
      : await Promise.all(
          (event.rooms ?? []).map((room) =>
            createRoom(
              db,
              landlordOpenId,
              {
                ...room,
                assetId: asset.id
              },
              event
            )
          )
        );
  const tenant = await createTenant(db, landlordOpenId, event.tenant, event);
  const primaryRoom = rooms[0];
  const lease = await createLease(
    db,
    landlordOpenId,
    {
      ...event.lease,
      roomId: primaryRoom.id,
      tenantId: tenant.id
    },
    event
  );

  return {
    mode: 'quick-entry',
    asset,
    rooms,
    tenant,
    lease
  };
}
