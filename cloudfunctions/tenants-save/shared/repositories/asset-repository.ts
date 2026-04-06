import { COLLECTIONS } from '../constants/collections';
import { assetSchema, type Asset, type AssetInput } from '../schemas/asset';
import { roomSchema, type Room } from '../schemas/room';
import { createId, insertRecord, listAll, resolveNow, type CloudEventBase, type DbLike, updateRecord } from '../runtime';

function createWholeUnitDefaultRoom(asset: Asset, now: string): Room {
  return roomSchema.parse({
    id: createId('room'),
    landlordOpenId: asset.landlordOpenId,
    assetId: asset.id,
    name: `${asset.name} 整租单元`,
    note: '',
    isWholeUnitDefault: true,
    createdAt: now,
    updatedAt: now
  });
}

export async function createAssetWithDefaultRoomForWholeMode(
  db: DbLike,
  landlordOpenId: string,
  input: AssetInput,
  event: CloudEventBase
) {
  const now = resolveNow(event);
  const asset = assetSchema.parse({
    id: createId('asset'),
    landlordOpenId,
    ...input,
    createdAt: now,
    updatedAt: now
  });

  await insertRecord(db, COLLECTIONS.assets, asset);

  let defaultRoom: Room | null = null;
  if (asset.rentalMode === 'whole') {
    defaultRoom = createWholeUnitDefaultRoom(asset, now);
    await insertRecord(db, COLLECTIONS.rooms, defaultRoom);
  }

  return {
    asset,
    defaultRoom
  };
}

export async function updateAsset(db: DbLike, assetId: string, changes: Partial<AssetInput>, event: CloudEventBase) {
  return updateRecord<Asset>(db, COLLECTIONS.assets, assetId, {
    ...changes,
    updatedAt: resolveNow(event)
  });
}

export async function listAssets(db: DbLike) {
  return listAll<Asset>(db, COLLECTIONS.assets);
}
