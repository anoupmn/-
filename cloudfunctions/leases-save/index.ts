import { createLease, updateLease } from './shared/repositories/lease-repository';
import { resolveDb, resolveLandlordOpenId, type CloudEventBase } from './shared/runtime';
import type { LeaseInput } from './shared/schemas/lease';

export interface LeaseSaveEvent extends CloudEventBase {
  leaseId?: string;
  lease: LeaseInput;
}

export async function main(event: LeaseSaveEvent) {
  const db = resolveDb(event);

  if (event.leaseId) {
    return updateLease(db, event.leaseId, event.lease, event);
  }

  return createLease(db, resolveLandlordOpenId(event), event.lease, event);
}
