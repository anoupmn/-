import { COLLECTIONS } from '../constants/collections';
import { assertSingleActiveLease, closeLeaseAndDeriveUnitStatus } from '../calculators/lease-lifecycle';
import { getLeaseFeeRules, leaseSchema, type Lease, type LeaseInput } from '../schemas/lease';
import { createId, findById, insertRecord, listAll, resolveNow, type CloudEventBase, type DbLike, updateRecord } from '../runtime';
import { syncBillsForLease } from './bill-repository';

function resolveNextFeeRules(currentLease: Lease, changes: Partial<LeaseInput>) {
  const baseFeeRules = getLeaseFeeRules(currentLease);

  if (changes.feeRules) {
    return getLeaseFeeRules({
      rentAmount: changes.rentAmount ?? currentLease.rentAmount,
      depositAmount: changes.depositAmount ?? currentLease.depositAmount,
      feeRules: changes.feeRules
    });
  }

  return getLeaseFeeRules({
    rentAmount: changes.rentAmount ?? currentLease.rentAmount,
    depositAmount: changes.depositAmount ?? currentLease.depositAmount,
    feeRules: {
      ...baseFeeRules,
      rent: {
        ...baseFeeRules.rent,
        amount: changes.rentAmount ?? baseFeeRules.rent.amount
      },
      deposit: {
        ...baseFeeRules.deposit,
        amount: changes.depositAmount ?? baseFeeRules.deposit.amount
      }
    }
  });
}

export async function createLease(db: DbLike, landlordOpenId: string, input: LeaseInput, event: CloudEventBase) {
  const leases = await listAll<Lease>(db, COLLECTIONS.leases);
  const lease = leaseSchema.parse({
    id: createId('lease'),
    landlordOpenId,
    ...input,
    feeRules: getLeaseFeeRules({
      rentAmount: input.rentAmount,
      depositAmount: input.depositAmount,
      feeRules: input.feeRules
    }),
    note: input.note ?? '',
    closedAt: null,
    createdAt: resolveNow(event),
    updatedAt: resolveNow(event)
  });

  assertSingleActiveLease(leases, lease, resolveNow(event));
  await insertRecord(db, COLLECTIONS.leases, lease);
  await syncBillsForLease(db, lease, event);
  return lease;
}

export async function updateLease(db: DbLike, leaseId: string, changes: Partial<LeaseInput>, event: CloudEventBase) {
  const currentLease = await findById<Lease>(db, COLLECTIONS.leases, leaseId);

  if (!currentLease) {
    throw new Error(`Lease ${leaseId} not found.`);
  }

  const nextLease = leaseSchema.parse({
    ...currentLease,
    ...changes,
    feeRules: resolveNextFeeRules(currentLease, changes),
    updatedAt: resolveNow(event)
  });

  const updatedLease = await updateRecord<Lease>(db, COLLECTIONS.leases, leaseId, {
    ...changes,
    feeRules: nextLease.feeRules,
    updatedAt: resolveNow(event)
  });
  await syncBillsForLease(db, updatedLease, event);
  return updatedLease;
}

export async function endLease(db: DbLike, leaseId: string, event: CloudEventBase) {
  const currentLeaseSnapshot = await db.collection(COLLECTIONS.leases).where({ id: leaseId }).get();
  const currentLease = (currentLeaseSnapshot.data?.[0] as Lease | undefined) ?? null;

  if (!currentLease) {
    throw new Error(`Lease ${leaseId} not found.`);
  }

  const roomLeasesSnapshot = await db.collection(COLLECTIONS.leases).where({ roomId: currentLease.roomId }).get();
  const roomLeases = (roomLeasesSnapshot.data ?? []) as Lease[];

  const result = closeLeaseAndDeriveUnitStatus(
    currentLease,
    roomLeases,
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
