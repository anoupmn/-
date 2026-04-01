import { callCloudFunction } from './cloud';

export function saveTenant(payload: Record<string, unknown>) {
  return callCloudFunction('tenants-save', payload);
}
