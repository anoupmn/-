import { createAssetWithDefaultRoomForWholeMode, updateAsset } from './shared/repositories/asset-repository';
import { resolveDb, resolveLandlordOpenId, type CloudEventBase } from './shared/runtime';
import type { AssetInput } from './shared/schemas/asset';

export interface AssetSaveEvent extends CloudEventBase {
  assetId?: string;
  asset: AssetInput;
}

export async function main(event: AssetSaveEvent) {
  const db = resolveDb(event);

  if (event.assetId) {
    return {
      asset: await updateAsset(db, event.assetId, event.asset, event),
      defaultRoom: null
    };
  }

  return createAssetWithDefaultRoomForWholeMode(db, resolveLandlordOpenId(event), event.asset, event);
}
