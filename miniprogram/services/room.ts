import { callCloudFunction } from './cloud';

export function saveRoom(payload: Record<string, unknown>) {
  return callCloudFunction('rooms-save', payload);
}

export function listRoomsByAsset(assetId: string) {
  return callCloudFunction('rooms-list', { assetId });
}
