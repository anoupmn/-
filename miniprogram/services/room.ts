import { callCloudFunction } from './cloud';

export function saveRoom(payload: Record<string, unknown>) {
  return callCloudFunction('rooms-save', payload);
}
