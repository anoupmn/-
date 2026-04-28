import { createLease, updateLease } from './shared/repositories/lease-repository';
import { COLLECTIONS } from './shared/constants/collections';
import { listAll, resolveDb, resolveLandlordOpenId, resolveNow, updateRecord, type CloudEventBase } from './shared/runtime';
import type { Lease } from './shared/schemas/lease';
import type { LeaseInput } from './shared/schemas/lease';

export interface LeaseSaveEvent extends CloudEventBase {
  leaseId?: string;
  renewFromLeaseId?: string;
  lease: LeaseInput;
}

export async function main(event: LeaseSaveEvent) {
  const db = resolveDb(event);
  const landlordOpenId = resolveLandlordOpenId(event);

  const [rooms, tenants] = await Promise.all([
    listAll<{ id: string; landlordOpenId: string }>(db, COLLECTIONS.rooms),
    listAll<{ id: string; landlordOpenId: string }>(db, COLLECTIONS.tenants)
  ]);
  const ownedRoom = rooms.find((item) => item.id === event.lease.roomId && item.landlordOpenId === landlordOpenId);
  if (!ownedRoom) {
    throw new Error(`Room ${event.lease.roomId} not found.`);
  }

  const ownedTenant = tenants.find((item) => item.id === event.lease.tenantId && item.landlordOpenId === landlordOpenId);
  if (!ownedTenant) {
    throw new Error(`Tenant ${event.lease.tenantId} not found.`);
  }

  if (event.leaseId) {
    const leases = await listAll<{ id: string; landlordOpenId: string }>(db, COLLECTIONS.leases);
    const ownedLease = leases.find((item) => item.id === event.leaseId && item.landlordOpenId === landlordOpenId);

    if (!ownedLease) {
      throw new Error(`Lease ${event.leaseId} not found.`);
    }

    return updateLease(db, event.leaseId, event.lease, event);
  }

  if (event.renewFromLeaseId) {
    const leases = await listAll<Lease>(db, COLLECTIONS.leases);
    const sourceLease = leases.find((item) => item.id === event.renewFromLeaseId && item.landlordOpenId === landlordOpenId);

    if (!sourceLease) {
      throw new Error(`Lease ${event.renewFromLeaseId} not found.`);
    }

    if (sourceLease.roomId !== event.lease.roomId || sourceLease.tenantId !== event.lease.tenantId) {
      throw new Error('Renewal lease must keep the same room and tenant.');
    }

    const renewalLease = await createLease(db, landlordOpenId, {
      ...event.lease,
      renewalFromLeaseId: sourceLease.id
    }, event);
    const renewedAt = resolveNow(event);
    await updateRecord<Lease>(db, COLLECTIONS.leases, sourceLease.id, {
      renewedToLeaseId: renewalLease.id,
      renewedAt,
      renewalEndDate: renewalLease.endDate,
      updatedAt: renewedAt
    });

    return renewalLease;
  }

  return createLease(db, landlordOpenId, event.lease, event);
}
