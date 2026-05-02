import { COLLECTIONS } from '../constants/collections';
import { assertSingleActiveLease, closeLeaseAndDeriveUnitStatus, deriveLeaseStatus } from '../calculators/lease-lifecycle';
import { LEASE_STATUSES } from '../constants/statuses';
import { getLeaseFeeRules, leaseSchema, type Lease, type LeaseInput } from '../schemas/lease';
import { billSchema, type Bill } from '../schemas/bill';
import { createId, findById, insertRecord, listAll, removeRecordsByQuery, resolveNow, type CloudEventBase, type DbLike, updateRecord } from '../runtime';
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

interface SettlementOptions {
  voidFutureSystemBills?: boolean;
  rentRefundDays?: number;
  refundDeposit?: boolean;
  refundFireDeposit?: boolean;
  refundLockCardDeposit?: boolean;
}

function calculateRentRefund(lease: Lease, days: number): number {
  if (days <= 0) return 0;
  const dailyRate = lease.rentAmount / lease.billingCycleDays;
  return Math.ceil(dailyRate * days * 100) / 100;
}

export async function endLease(db: DbLike, leaseId: string, event: CloudEventBase, settlement?: SettlementOptions) {
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
  const duplicateActiveLeases = leases.filter(
    (lease) =>
      lease.id !== leaseId &&
      lease.roomId === currentLease.roomId &&
      deriveLeaseStatus(lease, resolveNow(event)) === LEASE_STATUSES.active
  );
  for (const lease of duplicateActiveLeases) {
    await updateRecord<Lease>(db, COLLECTIONS.leases, lease.id, {
      closedAt: result.closedLease.closedAt,
      updatedAt: result.closedLease.updatedAt
    });
  }
  const unpaidBills = await listLeaseBillsSafely(db, leaseId).then((bills) =>
    bills.filter((bill) => !bill.receivedAt && bill.receivedAmount == null)
  );

  const settlementSummary: {
    voidedBillCount: number;
    createdRefundBills: Array<{ type: string; amount: number }>;
  } = { voidedBillCount: 0, createdRefundBills: [] };

  if (settlement) {
    if (settlement.voidFutureSystemBills) {
      const futureUnpaidSystemBills = (await listLeaseBillsSafely(db, leaseId)).filter(
        (bill) =>
          bill.dueDate > result.closedLease.closedAt &&
          !bill.receivedAt &&
          bill.receivedAmount == null &&
          (bill.source ?? 'system') === 'system'
      );
      for (const bill of futureUnpaidSystemBills) {
        await removeRecordsByQuery(db, COLLECTIONS.bills, { id: bill.id, landlordOpenId: currentLease.landlordOpenId });
      }
      settlementSummary.voidedBillCount = futureUnpaidSystemBills.length;
    }

    if (settlement.rentRefundDays && settlement.rentRefundDays > 0) {
      const refundAmount = calculateRentRefund(currentLease, settlement.rentRefundDays);
      const refundBill = billSchema.parse({
        id: createId('bill'),
        landlordOpenId: currentLease.landlordOpenId,
        leaseId: currentLease.id,
        roomId: currentLease.roomId,
        type: 'rent_refund',
        section: 'rent',
        dueDate: result.closedLease.closedAt,
        amount: refundAmount,
        status: 'pending',
        receivedAt: null,
        receivedAmount: null,
        note: `退余下租金 ${settlement.rentRefundDays}天`,
        source: 'system',
        feeNature: 'one_time',
        responsibility: 'landlord',
        cadence: 'once',
        isDepositLike: false,
        isOneTime: true,
        createdAt: result.closedLease.closedAt,
        updatedAt: result.closedLease.closedAt
      });
      await insertRecord(db, COLLECTIONS.bills, refundBill);
      settlementSummary.createdRefundBills.push({ type: 'rent_refund', amount: refundAmount });
    }

    const feeRules = getLeaseFeeRules(currentLease);
    const depositItems: Array<{ condition?: boolean; amount: number; note: string }> = [
      { condition: settlement.refundDeposit, amount: feeRules.deposit.amount, note: '退还押金' },
      { condition: settlement.refundFireDeposit, amount: feeRules.fireDeposit.amount, note: '退还消防押金' },
      { condition: settlement.refundLockCardDeposit, amount: feeRules.lockCardDeposit.amount, note: '退还门禁卡押金' }
    ];
    for (const item of depositItems) {
      if (item.condition && item.amount > 0) {
        const refundBill = billSchema.parse({
          id: createId('bill'),
          landlordOpenId: currentLease.landlordOpenId,
          leaseId: currentLease.id,
          roomId: currentLease.roomId,
          type: 'deposit_refund',
          section: 'deposit',
          dueDate: result.closedLease.closedAt,
          amount: item.amount,
          status: 'pending',
          receivedAt: null,
          receivedAmount: null,
          note: item.note,
          source: 'system',
          feeNature: 'deposit',
          responsibility: 'landlord',
          cadence: 'once',
          isDepositLike: true,
          isOneTime: true,
          createdAt: result.closedLease.closedAt,
          updatedAt: result.closedLease.closedAt
        });
        await insertRecord(db, COLLECTIONS.bills, refundBill);
        settlementSummary.createdRefundBills.push({ type: 'deposit_refund', amount: item.amount });
      }
    }
  }

  return {
    lease: updatedLease,
    currentStatus: result.currentStatus,
    unpaidBillSummary: {
      count: unpaidBills.length,
      amount: unpaidBills.reduce((sum, bill) => sum + Number(bill.amount || 0), 0)
    },
    unpaidBillOptions:
      unpaidBills.length > 0
        ? ['keep_debt', 'void_unpaid_system_bills', 'adjust_end_date_and_resync']
        : [],
    settlementSummary
  };
}

export async function listLeasesByRoom(db: DbLike, roomId: string) {
  const leases = await listAll<Lease>(db, COLLECTIONS.leases);
  return leases.filter((lease) => lease.roomId === roomId);
}

async function listLeaseBillsSafely(db: DbLike, leaseId: string) {
  try {
    const bills = await listAll<Bill>(db, COLLECTIONS.bills);
    return bills.filter((bill) => bill.leaseId === leaseId);
  } catch {
    return [];
  }
}

async function listRecordsSafely<T extends { leaseId?: string }>(db: DbLike, collectionName: string, leaseId: string) {
  try {
    const records = await listAll<T & { id: string }>(db, collectionName);
    return records.filter((record) => record.leaseId === leaseId);
  } catch {
    return [];
  }
}

export async function getLeaseDeleteBlockers(db: DbLike, leaseId: string, landlordOpenId: string) {
  const [bills, repairs, ownerExpenses, receipts] = await Promise.all([
    listLeaseBillsSafely(db, leaseId),
    listRecordsSafely<{ leaseId?: string }>(db, COLLECTIONS.repairRecords, leaseId),
    listRecordsSafely<{ leaseId?: string }>(db, COLLECTIONS.ownerExpenses, leaseId),
    listRecordsSafely<{ leaseId?: string; billId?: string; billIds?: string[] }>(db, COLLECTIONS.receipts, leaseId)
  ]);
  const landlordBills = bills.filter((bill) => bill.landlordOpenId === landlordOpenId);
  const billIds = new Set(landlordBills.map((bill) => bill.id));
  const hasReceiptReference =
    landlordBills.some((bill) => Boolean((bill as Bill & { receiptId?: string }).receiptId)) ||
    receipts.some((receipt) => {
      if (receipt.leaseId === leaseId) {
        return true;
      }

      if (receipt.billId && billIds.has(receipt.billId)) {
        return true;
      }

      return Array.isArray(receipt.billIds) && receipt.billIds.some((billId) => billIds.has(String(billId)));
    });
  const blockers: Array<{ code: 'paid_bill' | 'receipt' | 'repair_record' | 'owner_expense'; count: number }> = [];
  const paidBillCount = landlordBills.filter((bill) => bill.receivedAt && bill.receivedAmount !== null).length;

  if (paidBillCount > 0) {
    blockers.push({ code: 'paid_bill', count: paidBillCount });
  }

  if (hasReceiptReference) {
    blockers.push({ code: 'receipt', count: 1 });
  }

  if (repairs.length > 0) {
    blockers.push({ code: 'repair_record', count: repairs.length });
  }

  if (ownerExpenses.length > 0) {
    blockers.push({ code: 'owner_expense', count: ownerExpenses.length });
  }

  return blockers;
}

export async function deleteLeaseSafely(
  db: DbLike,
  leaseId: string,
  landlordOpenId: string,
  options: { confirm?: boolean } = {}
) {
  const lease = await findById<Lease>(db, COLLECTIONS.leases, leaseId);
  if (!lease || lease.landlordOpenId !== landlordOpenId) {
    throw new Error(`Lease ${leaseId} not found.`);
  }

  const bills = await listLeaseBillsSafely(db, leaseId);
  const deletableBills = bills.filter((bill) =>
    bill.landlordOpenId === landlordOpenId &&
    !bill.receivedAt &&
    bill.receivedAmount === null &&
    !(bill as Bill & { receiptId?: string }).receiptId
  );
  const blockers = await getLeaseDeleteBlockers(db, leaseId, landlordOpenId);
  const summary = {
    canDelete: blockers.length === 0,
    blockers,
    unpaidBillCount: deletableBills.length
  };

  if (!summary.canDelete || options.confirm !== true) {
    return {
      ...summary,
      deleted: false,
      deletedBillCount: 0
    };
  }

  for (const bill of deletableBills) {
    await removeRecordsByQuery(db, COLLECTIONS.bills, { id: bill.id, landlordOpenId });
  }
  await removeRecordsByQuery(db, COLLECTIONS.leases, { id: leaseId, landlordOpenId });

  return {
    ...summary,
    deleted: true,
    deletedBillCount: deletableBills.length
  };
}
