import { deleteLeaseSafely } from './shared/repositories/lease-repository';
import { resolveDb, resolveLandlordOpenId, type CloudEventBase } from './shared/runtime';

export interface LeasesDeleteEvent extends CloudEventBase {
  leaseId: string;
  mode?: 'check' | 'delete';
  confirm?: boolean;
}

export async function main(event: LeasesDeleteEvent) {
  const leaseId = String(event.leaseId || '').trim();
  if (!leaseId) {
    throw new Error('leaseId is required.');
  }

  const db = resolveDb(event);
  const landlordOpenId = resolveLandlordOpenId(event);
  const mode = event.mode ?? 'check';

  return deleteLeaseSafely(db, leaseId, landlordOpenId, {
    confirm: mode === 'delete' && event.confirm === true
  });
}
