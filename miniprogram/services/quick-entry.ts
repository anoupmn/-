import { callCloudFunction } from './cloud';

export function submitQuickEntry(payload: Record<string, unknown>) {
  return callCloudFunction('quick-entry', payload as { mode: 'quick-entry' });
}
