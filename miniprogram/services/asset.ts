import { callCloudFunction } from './cloud';

export function saveAsset(payload: Record<string, unknown>) {
  return callCloudFunction('assets-save', payload);
}

export function listAssets() {
  return callCloudFunction('assets-list');
}
