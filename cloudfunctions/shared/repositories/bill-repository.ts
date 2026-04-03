import dayjs from 'dayjs';

import { COLLECTIONS } from '../constants/collections';
import { BILL_STATUSES } from '../constants/statuses';
import { deriveBillStatus } from '../calculators/bill-status';
import { billSchema, type Bill, type BillSection, type BillType } from '../schemas/bill';
import { getLeaseFeeRules, type CustomFeeItem, type Lease, type LeaseFeeRule } from '../schemas/lease';
import { createId, insertRecord, listAll, resolveNow, type CloudEventBase, type DbLike } from '../runtime';

type FeeItemDefinition = {
  type: BillType;
  section: BillSection;
  amount: number;
  cadence: LeaseFeeRule['cadence'];
  itemKey?: string;
  itemLabel?: string;
};

function buildRecurringDueDates(lease: Lease) {
  const dueDates: string[] = [];
  let current = dayjs(lease.startDate);
  const endDate = dayjs(lease.endDate);

  while (!current.isAfter(endDate, 'day')) {
    dueDates.push(current.format('YYYY-MM-DD'));
    current = current.add(lease.billingCycleDays, 'day');
  }

  return dueDates;
}

function mapLeaseFeeItems(lease: Lease): FeeItemDefinition[] {
  const feeRules = getLeaseFeeRules(lease);
  const items: FeeItemDefinition[] = [
    { type: 'rent', section: 'rent', amount: feeRules.rent.amount, cadence: feeRules.rent.cadence },
    { type: 'deposit', section: 'deposit', amount: feeRules.deposit.amount, cadence: feeRules.deposit.cadence }
  ];

  const optionalRuleEntries: Array<{ type: BillType; rule: LeaseFeeRule | undefined }> = [
    { type: 'water', rule: feeRules.water },
    { type: 'electricity', rule: feeRules.electricity },
    { type: 'property', rule: feeRules.property },
    { type: 'misc', rule: feeRules.misc }
  ];

  optionalRuleEntries.forEach(({ type, rule }) => {
    if (!rule || rule.amount <= 0) {
      return;
    }

    items.push({
      type,
      section: 'non_rent',
      amount: rule.amount,
      cadence: rule.cadence
    });
  });

  feeRules.customFeeItems.forEach((item: CustomFeeItem) => {
    if (item.amount <= 0) {
      return;
    }

    items.push({
      type: 'custom',
      section: 'non_rent',
      amount: item.amount,
      cadence: item.cadence,
      itemKey: item.key,
      itemLabel: item.label
    });
  });

  return items;
}

function buildBillsForLease(lease: Lease, event: CloudEventBase) {
  const generatedAt = resolveNow(event);
  const recurringDueDates = buildRecurringDueDates(lease);
  const feeItems = mapLeaseFeeItems(lease);

  return feeItems.flatMap((item) => {
    const dueDates = item.cadence === 'once' ? [lease.startDate] : recurringDueDates;

    return dueDates.map((dueDate) => {
      const parsed = billSchema.parse({
        id: createId('bill'),
        landlordOpenId: lease.landlordOpenId,
        leaseId: lease.id,
        roomId: lease.roomId,
        type: item.type,
        section: item.section,
        dueDate,
        amount: item.amount,
        status: BILL_STATUSES.pending,
        receivedAt: null,
        receivedAmount: null,
        note: '',
        itemKey: item.itemKey,
        itemLabel: item.itemLabel,
        createdAt: generatedAt,
        updatedAt: generatedAt
      });

      return {
        ...parsed,
        status: deriveBillStatus(parsed, generatedAt)
      };
    });
  });
}

export async function listBillsByLease(db: DbLike, leaseId: string) {
  const bills = await listAll<Bill>(db, COLLECTIONS.bills);
  return bills
    .filter((bill) => bill.leaseId === leaseId)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export async function listOutstandingBillsByRoom(db: DbLike, roomId: string, now: string) {
  const bills = await listAll<Bill>(db, COLLECTIONS.bills);
  return bills
    .filter((bill) => bill.roomId === roomId)
    .map((bill) => ({
      ...bill,
      status: deriveBillStatus(bill, now)
    }))
    .filter((bill) => bill.status !== BILL_STATUSES.paid)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export async function syncBillsForLease(db: DbLike, lease: Lease, event: CloudEventBase) {
  await db.collection(COLLECTIONS.bills).where({ leaseId: lease.id }).remove();

  const bills = buildBillsForLease(lease, event);
  for (const bill of bills) {
    await insertRecord(db, COLLECTIONS.bills, bill);
  }

  return bills;
}
