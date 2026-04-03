import { main as leasesSaveMain } from '../../cloudfunctions/leases-save/index';
import { listOutstandingBillsByRoom } from '../../cloudfunctions/shared/repositories/bill-repository';
import { createMockDb, createMockStore, getWXContext } from '../helpers/mock-cloud';

describe('leases-save billing integration', () => {
  it('creates bills when a lease is created and seeds the next receivable from fee rules', async () => {
    const store = createMockStore();
    const __mockDb = createMockDb(store);
    const __mockContext = {
      getWXContext: () => getWXContext('openid-save')
    };

    const lease = await leasesSaveMain({
      lease: {
        roomId: 'room_1',
        tenantId: 'tenant_1',
        startDate: '2026-04-01',
        endDate: '2026-05-31',
        billingCycleDays: 30,
        rentAmount: 999,
        depositAmount: 2000,
        feeRules: {
          rent: { amount: 2100, cadence: 'cycle' },
          deposit: { amount: 2000, cadence: 'once' },
          customFeeItems: []
        },
        note: ''
      },
      __mockDb,
      __mockContext,
      now: '2026-04-01T00:00:00.000Z'
    });

    const bills = await listOutstandingBillsByRoom(__mockDb, 'room_1', '2026-04-01T00:00:00.000Z');
    const rentBill = bills.find((bill) => bill.type === 'rent');

    expect(lease.id).toContain('lease_');
    expect(store.bills).not.toHaveLength(0);
    expect(rentBill?.amount).toBe(2100);
  });

  it('re-syncs bills after updates so the next receivable follows the latest rule set', async () => {
    const store = createMockStore();
    const __mockDb = createMockDb(store);
    const __mockContext = {
      getWXContext: () => getWXContext('openid-save')
    };

    const lease = await leasesSaveMain({
      lease: {
        roomId: 'room_1',
        tenantId: 'tenant_1',
        startDate: '2026-04-01',
        endDate: '2026-05-31',
        billingCycleDays: 30,
        rentAmount: 1800,
        depositAmount: 1800,
        note: ''
      },
      __mockDb,
      __mockContext,
      now: '2026-04-01T00:00:00.000Z'
    });

    await leasesSaveMain({
      leaseId: lease.id,
      lease: {
        roomId: 'room_1',
        tenantId: 'tenant_1',
        startDate: '2026-04-01',
        endDate: '2026-05-31',
        billingCycleDays: 30,
        rentAmount: 1880,
        depositAmount: 1800,
        note: ''
      },
      __mockDb,
      __mockContext,
      now: '2026-04-02T00:00:00.000Z'
    });

    const bills = await listOutstandingBillsByRoom(__mockDb, 'room_1', '2026-04-02T00:00:00.000Z');
    const rentBill = bills.find((bill) => bill.type === 'rent');

    expect(bills.filter((bill) => bill.type === 'rent')).toHaveLength(3);
    expect(rentBill?.amount).toBe(1880);
  });
});
