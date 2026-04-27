import dayjs from 'dayjs';

import { COLLECTIONS } from '../constants/collections';
import { BILL_STATUSES } from '../constants/statuses';
import { deriveBillStatus } from '../calculators/bill-status';
import { billSchema, type Bill, type BillFeeNature, type BillSection, type BillType, type MeterReading } from '../schemas/bill';
import { getLeaseFeeRules, type CustomFeeItem, type Lease, type LeaseFeeRule } from '../schemas/lease';
import { createId, findById, insertRecord, listAll, resolveNow, updateRecord, type CloudEventBase, type DbLike } from '../runtime';

type FeeItemDefinition = {
  type: BillType;
  section: BillSection;
  amount: number;
  cadence: LeaseFeeRule['cadence'];
  feeNature: BillFeeNature;
  isDepositLike: boolean;
  legacy?: boolean;
  itemKey?: string;
  itemLabel?: string;
};

const LANDLORD_EXPENSE_LABEL_PATTERN = /维修|保洁|打理|请人|管理支出|房东支出/u;

function resolveFeeNatureFromCadence(cadence: LeaseFeeRule['cadence']): BillFeeNature {
  return cadence === 'once' ? 'one_time' : 'recurring';
}

function isUtilityBillType(type: BillType) {
  return type === 'water' || type === 'electricity';
}

export function calculateMeterBill(input: {
  previousReading: number;
  currentReading: number;
  unitPrice: number;
}) {
  const previousReading = Number(input.previousReading);
  const currentReading = Number(input.currentReading);
  const unitPrice = Number(input.unitPrice);

  if (![previousReading, currentReading, unitPrice].every(Number.isFinite)) {
    throw new Error('previousReading, currentReading and unitPrice must be valid numbers.');
  }

  if (previousReading < 0 || currentReading < 0 || unitPrice < 0) {
    throw new Error('previousReading, currentReading and unitPrice must be non-negative.');
  }

  if (currentReading < previousReading) {
    throw new Error('currentReading must be greater than or equal to previousReading.');
  }

  const usage = currentReading - previousReading;
  const amount = Math.round(usage * unitPrice * 100) / 100;

  return {
    amount,
    meterReading: {
      previousReading,
      currentReading,
      usage,
      unitPrice
    }
  };
}

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
    {
      type: 'rent',
      section: 'rent',
      amount: feeRules.rent.amount,
      cadence: feeRules.rent.cadence,
      feeNature: 'recurring',
      isDepositLike: false
    },
    {
      type: 'deposit',
      section: 'deposit',
      amount: feeRules.deposit.amount,
      cadence: feeRules.deposit.cadence,
      feeNature: 'deposit',
      isDepositLike: true
    }
  ];

  if (feeRules.management.amount > 0) {
    items.push({
      type: 'management',
      section: 'non_rent',
      amount: feeRules.management.amount,
      cadence: feeRules.management.cadence,
      feeNature: resolveFeeNatureFromCadence(feeRules.management.cadence),
      isDepositLike: false
    });
  }

  if (feeRules.fireDeposit.amount > 0) {
    items.push({
      type: 'fire_deposit',
      section: 'deposit',
      amount: feeRules.fireDeposit.amount,
      cadence: 'once',
      feeNature: 'deposit',
      isDepositLike: true
    });
  }

  if (feeRules.lockCardDeposit.amount > 0) {
    items.push({
      type: 'lock_card_deposit',
      section: 'deposit',
      amount: feeRules.lockCardDeposit.amount,
      cadence: 'once',
      feeNature: 'deposit',
      isDepositLike: true
    });
  }

  const optionalRuleEntries: Array<{ type: BillType; rule: LeaseFeeRule | undefined; legacy?: boolean }> = [
    { type: 'water', rule: feeRules.water },
    { type: 'electricity', rule: feeRules.electricity },
    { type: 'property', rule: feeRules.property, legacy: true },
    { type: 'misc', rule: feeRules.misc }
  ];

  optionalRuleEntries.forEach(({ type, rule, legacy }) => {
    if (!rule || rule.amount <= 0) {
      return;
    }

    items.push({
      type,
      section: 'non_rent',
      amount: rule.amount,
      cadence: rule.cadence,
      feeNature: resolveFeeNatureFromCadence(rule.cadence),
      isDepositLike: false,
      legacy
    });
  });

  feeRules.customFeeItems.forEach((item: CustomFeeItem) => {
    if (item.amount <= 0) {
      return;
    }

    items.push({
      type: 'custom',
      section: item.feeNature === 'deposit' ? 'deposit' : 'non_rent',
      amount: item.amount,
      cadence: item.cadence,
      feeNature: item.feeNature,
      isDepositLike: item.feeNature === 'deposit',
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
        source: 'system',
        feeNature: item.feeNature,
        responsibility: 'tenant',
        cadence: item.cadence,
        isDepositLike: item.isDepositLike,
        isOneTime: item.cadence === 'once',
        legacy: item.legacy ?? false,
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

export function isReplaceableSystemBill(bill: Bill) {
  return (
    (bill.source ?? 'system') === 'system' &&
    !bill.receivedAt &&
    bill.receivedAmount === null &&
    !(bill as Bill & { receiptId?: string }).receiptId &&
    !(bill as Bill & { voidedAt?: string }).voidedAt
  );
}

export async function syncBillsForLease(db: DbLike, lease: Lease, event: CloudEventBase) {
  const existingBills = await listBillsByLease(db, lease.id);
  const replaceableBills = existingBills.filter(isReplaceableSystemBill);

  for (const bill of replaceableBills) {
    await db.collection(COLLECTIONS.bills).where({ id: bill.id }).remove();
  }

  const bills = buildBillsForLease(lease, event);
  for (const bill of bills) {
    await insertRecord(db, COLLECTIONS.bills, bill);
  }

  return bills;
}

export async function ensureBillsForLease(db: DbLike, lease: Lease, event: CloudEventBase) {
  const existingBills = await listBillsByLease(db, lease.id);

  if (existingBills.length > 0) {
    return existingBills;
  }

  return syncBillsForLease(db, lease, event);
}

export async function markBillReceived(
  db: DbLike,
  input: {
    billId: string;
    receivedAt: string;
    receivedAmount: number;
  },
  event: CloudEventBase
) {
  const bill = await findById<Bill>(db, COLLECTIONS.bills, input.billId);

  if (!bill) {
    throw new Error(`Bill ${input.billId} not found.`);
  }

  if (input.receivedAmount <= 0) {
    throw new Error('receivedAmount must be greater than 0.');
  }

  return updateRecord<Bill>(db, COLLECTIONS.bills, input.billId, {
    receivedAt: input.receivedAt,
    receivedAmount: input.receivedAmount,
    status: BILL_STATUSES.paid,
    updatedAt: resolveNow(event)
  });
}

export async function createManualBill(
  db: DbLike,
  input: {
    lease: Lease;
    type: BillType;
    section: BillSection;
    dueDate: string;
    amount: number;
    itemLabel?: string;
    note?: string;
  },
  event: CloudEventBase
) {
  if (isUtilityBillType(input.type)) {
    throw new Error('Utility bills must be created from meter readings.');
  }

  if (LANDLORD_EXPENSE_LABEL_PATTERN.test(String(input.itemLabel || ''))) {
    throw new Error('Landlord expenses must not be recorded as tenant bills.');
  }

  if (input.amount <= 0) {
    throw new Error('amount must be greater than 0.');
  }

  const createdAt = resolveNow(event);
  const parsed = billSchema.parse({
    id: createId('bill'),
    landlordOpenId: input.lease.landlordOpenId,
    leaseId: input.lease.id,
    roomId: input.lease.roomId,
    type: input.type,
    section: input.section,
    dueDate: input.dueDate,
    amount: input.amount,
    status: BILL_STATUSES.pending,
    receivedAt: null,
    receivedAmount: null,
    note: input.note ?? '',
    itemKey: input.type === 'custom' ? `manual_${Date.now()}` : undefined,
    itemLabel: input.itemLabel,
    source: 'manual',
    feeNature: 'one_time',
    responsibility: 'tenant',
    cadence: 'once',
    isDepositLike: false,
    isOneTime: true,
    createdAt,
    updatedAt: createdAt
  });

  const bill = {
    ...parsed,
    status: deriveBillStatus(parsed, createdAt)
  };

  await insertRecord(db, COLLECTIONS.bills, bill);
  return bill;
}

export async function createMeterBill(
  db: DbLike,
  input: {
    lease: Lease;
    type: 'water' | 'electricity';
    dueDate: string;
    previousReading: number;
    currentReading: number;
    unitPrice: number;
    note?: string;
  },
  event: CloudEventBase
) {
  const { amount, meterReading } = calculateMeterBill(input);
  const createdAt = resolveNow(event);
  const parsed = billSchema.parse({
    id: createId('bill'),
    landlordOpenId: input.lease.landlordOpenId,
    leaseId: input.lease.id,
    roomId: input.lease.roomId,
    type: input.type,
    section: 'non_rent',
    dueDate: input.dueDate,
    amount,
    status: BILL_STATUSES.pending,
    receivedAt: null,
    receivedAmount: null,
    note: input.note ?? '',
    itemKey: input.type,
    itemLabel: input.type === 'water' ? '水费' : '电费',
    source: 'manual',
    meterReading,
    feeNature: 'one_time',
    responsibility: 'tenant',
    cadence: 'once',
    isDepositLike: false,
    isOneTime: true,
    createdAt,
    updatedAt: createdAt
  });

  const bill = {
    ...parsed,
    status: deriveBillStatus(parsed, createdAt)
  };

  await insertRecord(db, COLLECTIONS.bills, bill);
  return bill;
}

export function resolveMeterDefaults(bills: Bill[], roomId: string): Record<'water' | 'electricity', { previousReading: number; unitPrice: number } | null> {
  const latestByType = (type: 'water' | 'electricity') =>
    bills
      .filter((bill) => bill.roomId === roomId && bill.type === type && bill.meterReading)
      .sort((a, b) => b.dueDate.localeCompare(a.dueDate) || b.updatedAt.localeCompare(a.updatedAt))[0];

  const toDefault = (bill?: Bill) => {
    const meterReading = bill?.meterReading as MeterReading | undefined;
    if (!meterReading) {
      return null;
    }

    return {
      previousReading: meterReading.currentReading,
      unitPrice: meterReading.unitPrice
    };
  };

  return {
    water: toDefault(latestByType('water')),
    electricity: toDefault(latestByType('electricity'))
  };
}
