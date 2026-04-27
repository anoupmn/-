import { callCloudFunction } from './cloud';

export function saveLease(payload: Record<string, unknown>) {
  return callCloudFunction('leases-save', payload);
}

export function endLease(payload: Record<string, unknown>) {
  return callCloudFunction('leases-end', payload);
}

export function deleteLease(payload: Record<string, unknown>) {
  return callCloudFunction('leases-delete', payload);
}
