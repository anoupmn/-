import { callCloudFunction } from './cloud';

export function saveRepairRecord(payload: {
  roomId?: string;
  assetId?: string;
  category: string;
  note: string;
  occurredAt?: string;
}) {
  return callCloudFunction('repair-record-save', payload);
}
