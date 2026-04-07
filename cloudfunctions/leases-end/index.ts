import { endLease } from './shared/repositories/lease-repository';
import { COLLECTIONS } from './shared/constants/collections';
import { listAll, resolveDb, resolveLandlordOpenId, type CloudEventBase } from './shared/runtime';

export interface LeaseEndEvent extends CloudEventBase {
  leaseId: string;
}

export async function main(event: LeaseEndEvent) {
  const db = resolveDb(event);
  const landlordOpenId = resolveLandlordOpenId(event);
  const leases = await listAll<{ id: string; landlordOpenId: string }>(db, COLLECTIONS.leases);
  const ownedLease = leases.find((item) => item.id === event.leaseId && item.landlordOpenId === landlordOpenId);

  if (!ownedLease) {
    throw new Error(`Lease ${event.leaseId} not found.`);
  }

  return endLease(db, event.leaseId, event);
}
