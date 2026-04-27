import { syncBillsForLease, listBillsByLease, listOutstandingBillsByRoom } from '../../cloudfunctions/shared/repositories/bill-repository';
import { BILL_STATUSES } from '../../cloudfunctions/shared/constants/statuses';
import type { Lease } from '../../cloudfunctions/shared/schemas/lease';
import { createMockDb, createMockStore } from '../helpers/mock-cloud';

function createLease(overrides: Partial<Lease> = {}): Lease {
  return {
    id: 'lease_1',
    landlordOpenId: 'openid',
    roomId: 'room_1',
    tenantId: 'tenant_1',
    startDate: '2026-04-01',
    endDate: '2026-05-31',
    billingCycleDays: 30,
    rentAmount: 2800,
    depositAmount: 2800,
    feeRules: {
      rent: { amount: 2800, cadence: 'cycle' },
      deposit: { amount: 2800, cadence: 'once' },
      water: { amount: 120, cadence: 'cycle' },
      customFeeItems: [
        {
          key: 'service_fee',
          label: '服务费',
          amount: 66,
          cadence: 'cycle'
        }
      ]
    },
    note: '',
    closedAt: null,
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
    ...overrides
  };
}

describe('bill repository sync', () => {
  it('generates cycle bills and a deposit bill with receivedAt left empty', async () => {
    const store = createMockStore();
    const db = createMockDb(store);

    await syncBillsForLease(db, createLease(), {
      __mockDb: db,
      now: '2026-04-01T00:00:00.000Z'
    });

    const bills = await listBillsByLease(db, 'lease_1');
    const deposit = bills.find((bill) => bill.type === 'deposit');
    const recurringRentBills = bills.filter((bill) => bill.type === 'rent');
    const recurringWaterBills = bills.filter((bill) => bill.type === 'water');
    const recurringCustomBills = bills.filter((bill) => bill.type === 'custom');

    expect(bills).toHaveLength(10);
    expect(recurringRentBills).toHaveLength(3);
    expect(recurringWaterBills).toHaveLength(3);
    expect(recurringCustomBills).toHaveLength(3);
    expect(deposit?.receivedAt).toBeNull();
    expect(deposit?.receivedAmount).toBeNull();
  });

  it('replaces existing bills when fee rules change and keeps next receivable aligned to generated bills', async () => {
    const store = createMockStore();
    const db = createMockDb(store);

    await syncBillsForLease(db, createLease(), {
      __mockDb: db,
      now: '2026-04-01T00:00:00.000Z'
    });
    await syncBillsForLease(
      db,
      createLease({
        feeRules: {
          rent: { amount: 3100, cadence: 'cycle' },
          deposit: { amount: 2800, cadence: 'once' },
          property: { amount: 200, cadence: 'cycle' },
          customFeeItems: []
        }
      }),
      {
        __mockDb: db,
        now: '2026-04-02T00:00:00.000Z'
      }
    );

    const bills = await listBillsByLease(db, 'lease_1');
    const outstanding = await listOutstandingBillsByRoom(db, 'room_1', '2026-04-02T00:00:00.000Z');
    const firstRentBill = outstanding.find((bill) => bill.type === 'rent');

    expect(bills).toHaveLength(7);
    expect(bills.some((bill) => bill.type === 'water')).toBe(false);
    expect(firstRentBill?.amount).toBe(3100);
    expect(firstRentBill?.status).toBe(BILL_STATUSES.overdue);
  });

  it('preserves paid bills and manual bills when lease is resynced', async () => {
    const store = createMockStore();
    const db = createMockDb(store);

    await syncBillsForLease(db, createLease(), {
      __mockDb: db,
      now: '2026-04-01T00:00:00.000Z'
    });

    const originalBills = await listBillsByLease(db, 'lease_1');
    const paidSystemBill = originalBills.find((bill) => bill.type === 'rent');
    const unpaidWaterBill = originalBills.find((bill) => bill.type === 'water');

    expect(paidSystemBill).toBeDefined();
    expect(unpaidWaterBill).toBeDefined();

    Object.assign(
      store.bills.find((bill) => bill.id === paidSystemBill!.id)!,
      {
        status: BILL_STATUSES.paid,
        receivedAt: '2026-04-03T00:00:00.000Z',
        receivedAmount: paidSystemBill!.amount
      }
    );
    store.bills.push({
      id: 'manual_bill_1',
      _id: 'db_manual_bill_1',
      landlordOpenId: 'openid',
      leaseId: 'lease_1',
      roomId: 'room_1',
      type: 'misc',
      section: 'non_rent',
      dueDate: '2026-04-15',
      amount: 88,
      status: BILL_STATUSES.pending,
      receivedAt: null,
      receivedAmount: null,
      note: '手工补录',
      source: 'manual',
      createdAt: '2026-04-03T00:00:00.000Z',
      updatedAt: '2026-04-03T00:00:00.000Z'
    });

    await syncBillsForLease(
      db,
      createLease({
        feeRules: {
          rent: { amount: 3100, cadence: 'cycle' },
          deposit: { amount: 2800, cadence: 'once' },
          customFeeItems: []
        }
      }),
      {
        __mockDb: db,
        now: '2026-04-04T00:00:00.000Z'
      }
    );

    const bills = await listBillsByLease(db, 'lease_1');

    expect(bills.some((bill) => bill.id === paidSystemBill!.id)).toBe(true);
    expect(bills.some((bill) => bill.id === 'manual_bill_1')).toBe(true);
    expect(bills.some((bill) => bill.id === unpaidWaterBill!.id)).toBe(false);
    expect(bills.filter((bill) => bill.type === 'rent' && bill.amount === 3100)).toHaveLength(3);
  });
});
