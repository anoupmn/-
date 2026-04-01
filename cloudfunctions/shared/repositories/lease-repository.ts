import { COLLECTIONS } from '../constants/collections';
import { assertSingleActiveLease, closeLeaseAndDeriveUnitStatus } from '../calculators/lease-lifecycle';
import { leaseSchema, type Lease, type LeaseInput } from '../schemas/lease';
import { createId, insertRecord, listAll, resolveNow, type CloudEventBase, type DbLike, updateRecord } from '../runtime';

export async function createLease(db: DbLike, landlordOpenId: string, input: LeaseInput, event: CloudEventBase) {
  const leases = await listAll<Lease>(db, COLLECTIONS.leases);
  const lease = leaseSchema.parse({
    id: createId('lease'),
    landlordOpenId,
    ...input,
    note: input.note ?? '',
    closedAt: null,
    createdAt: resolveNow(event),
    updatedAt: resolveNow(event)
  });

  assertSingleActiveLease(leases, lease, resolveNow(event));
  await insertRecord(db, COLLECTIONS.leases, lease);
  return lease;
}

export async function updateLease(db: DbLike, leaseId: string, changes: Partial<LeaseInput>, event: CloudEventBase) {
  return updateRecord<Lease>(db, COLLECTIONS.leases, leaseId, {
    ...changes,
    updatedAt: resolveNow(event)
  });
}

export async function endLease(db: DbLike, leaseId: string, event: CloudEventBase) {
  const leases = await listAll<Lease>(db, COLLECTIONS.leases);
  const currentLease = leases.find((lease) => lease.id === leaseId);

  if (!currentLease) {
    throw new Error(`Lease ${leaseId} not found.`);
  }

  const result = closeLeaseAndDeriveUnitStatus(
    currentLease,
    leases.filter((lease) => lease.roomId === currentLease.roomId),
    resolveNow(event)
  );

  const updatedLease = await updateRecord<Lease>(db, COLLECTIONS.leases, leaseId, {
    closedAt: result.closedLease.closedAt,
    updatedAt: result.closedLease.updatedAt
  });

  return {
    lease: updatedLease,
    currentStatus: result.currentStatus
  };
}

export async function listLeasesByRoom(db: DbLike, roomId: string) {
  const leases = await listAll<Lease>(db, COLLECTIONS.leases);
  return leases.filter((lease) => lease.roomId === roomId);
}
