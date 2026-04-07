import { createAssetWithDefaultRoomForWholeMode, updateAsset } from './shared/repositories/asset-repository';
import { COLLECTIONS } from './shared/constants/collections';
import { listAll, resolveDb, resolveLandlordOpenId, type CloudEventBase } from './shared/runtime';
import type { AssetInput } from './shared/schemas/asset';

export interface AssetSaveEvent extends CloudEventBase {
  assetId?: string;
  asset: AssetInput;
}

export async function main(event: AssetSaveEvent) {
  const db = resolveDb(event);
  const landlordOpenId = resolveLandlordOpenId(event);

  if (event.assetId) {
    const assets = await listAll<{ id: string; landlordOpenId: string }>(db, COLLECTIONS.assets);
    const ownedAsset = assets.find((item) => item.id === event.assetId && item.landlordOpenId === landlordOpenId);

    if (!ownedAsset) {
      throw new Error(`Asset ${event.assetId} not found.`);
    }

    return {
      asset: await updateAsset(db, event.assetId, event.asset, event),
      defaultRoom: null
    };
  }

  return createAssetWithDefaultRoomForWholeMode(db, landlordOpenId, event.asset, event);
}
