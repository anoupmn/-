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
});
