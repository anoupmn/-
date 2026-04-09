import { COLLECTIONS } from '../constants/collections';
import { assertSingleActiveLease, closeLeaseAndDeriveUnitStatus } from '../calculators/lease-lifecycle';
import { getLeaseFeeRules, leaseSchema, type Lease, type LeaseInput } from '../schemas/lease';
import { createId, findById, insertRecord, listAll, resolveNow, type CloudEventBase, type DbLike, updateRecord } from '../runtime';
import { syncBillsForLease } from './bill-repository';

function normalizeDateKey(value: unknown) {
  return String(value ?? '').slice(0, 10);
}

function resolveEffectiveLeaseEndDate(lease: Pick<Lease, 'endDate' | 'closedAt'>) {
  const contractEndDate = normalizeDateKey(lease.endDate);
  const closedDate = normalizeDateKey(lease.closedAt);

  if (closedDate && closedDate < contractEndDate) {
    return closedDate;
  }

  return contractEndDate;
}

function isDateRangeOverlapped(
  leftStartDate: string,
  leftEndDate: string,
  rightStartDate: string,
  rightEndDate: string
) {
  return leftStartDate <= rightEndDate && rightStartDate <= leftEndDate;
}

function assertNoLeaseDateOverlap(leases: Lease[], nextLease: Lease, excludeLeaseId?: string) {
  const nextStartDate = normalizeDateKey(nextLease.startDate);
  const nextEndDate = normalizeDateKey(nextLease.endDate);

  if (!nextStartDate || !nextEndDate) {
    throw new Error('租约日期不完整，请填写开始和结束日期后再保存。');
  }

  if (nextStartDate > nextEndDate) {
    throw new Error('租约开始日期不能晚于结束日期。');
  }

  const conflictLease = leases
    .filter(
      (lease) =>
        lease.id !== excludeLeaseId &&
        lease.roomId === nextLease.roomId &&
        lease.landlordOpenId === nextLease.landlordOpenId
    )
    .find((lease) =>
      isDateRangeOverlapped(
        normalizeDateKey(lease.startDate),
        resolveEffectiveLeaseEndDate(lease),
        nextStartDate,
        nextEndDate
      )
    );

  if (conflictLease) {
    throw new Error(
      `租约时间冲突：该房间已存在租约 ${normalizeDateKey(conflictLease.startDate)} 至 ${resolveEffectiveLeaseEndDate(conflictLease)}，请调整租期后再保存。`
    );
  }
}

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

  assertNoLeaseDateOverlap(leases, lease);
  assertSingleActiveLease(leases, lease, resolveNow(event));
  await insertRecord(db, COLLECTIONS.leases, lease);
  try {
    await syncBillsForLease(db, lease, event);
    return lease;
  } catch (error) {
    try {
      await db.collection(COLLECTIONS.bills).where({ leaseId: lease.id }).remove();
      await db.collection(COLLECTIONS.leases).where({ id: lease.id, landlordOpenId }).remove();
    } catch (cleanupError) {
      console.warn('rollback created lease after bill sync failure failed', cleanupError);
    }

    throw error;
  }
}

export async function updateLease(db: DbLike, leaseId: string, changes: Partial<LeaseInput>, event: CloudEventBase) {
  const currentLease = await findById<Lease>(db, COLLECTIONS.leases, leaseId);
  const leases = await listAll<Lease>(db, COLLECTIONS.leases);

  if (!currentLease) {
    throw new Error(`Lease ${leaseId} not found.`);
  }

  const nextLease = leaseSchema.parse({
    ...currentLease,
    ...changes,
    feeRules: resolveNextFeeRules(currentLease, changes),
    updatedAt: resolveNow(event)
  });

  assertNoLeaseDateOverlap(leases, nextLease, leaseId);
  assertSingleActiveLease(
    leases.filter((lease) => lease.id !== leaseId),
    nextLease,
    resolveNow(event)
  );
  const updatedLease = await updateRecord<Lease>(db, COLLECTIONS.leases, leaseId, {
    ...changes,
    feeRules: nextLease.feeRules,
    updatedAt: resolveNow(event)
  });
  await syncBillsForLease(db, updatedLease, event);
  return updatedLease;
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
