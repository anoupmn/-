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
    store.rooms.push({
      id: 'room_1',
      landlordOpenId: 'openid-save',
      assetId: 'asset_1',
      name: 'A101',
      note: '',
      isWholeUnitDefault: false,
      createdAt: '',
      updatedAt: ''
    });
    store.tenants.push({
      id: 'tenant_1',
      landlordOpenId: 'openid-save',
      name: '王租客',
      phone: '',
      note: '',
      createdAt: '',
      updatedAt: ''
    });

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
    store.rooms.push({
      id: 'room_1',
      landlordOpenId: 'openid-save',
      assetId: 'asset_1',
      name: 'A101',
      note: '',
      isWholeUnitDefault: false,
      createdAt: '',
      updatedAt: ''
    });
    store.tenants.push({
      id: 'tenant_1',
      landlordOpenId: 'openid-save',
      name: '王租客',
      phone: '',
      note: '',
      createdAt: '',
      updatedAt: ''
    });

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

  it('updates lease without silently deleting received or manual bills', async () => {
    const store = createMockStore();
    const __mockDb = createMockDb(store);
    const __mockContext = {
      getWXContext: () => getWXContext('openid-save')
    };
    store.rooms.push({
      id: 'room_1',
      _id: 'db_room_1',
      landlordOpenId: 'openid-save',
      assetId: 'asset_1',
      name: 'A101',
      note: '',
      isWholeUnitDefault: false,
      createdAt: '',
      updatedAt: ''
    });
    store.tenants.push({
      id: 'tenant_1',
      _id: 'db_tenant_1',
      landlordOpenId: 'openid-save',
      name: '王租客',
      phone: '',
      note: '',
      createdAt: '',
      updatedAt: ''
    });

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

    const paidBill = store.bills.find((bill) => bill.leaseId === lease.id && bill.type === 'rent');
    expect(paidBill).toBeDefined();
    Object.assign(paidBill!, {
      status: 'paid',
      receivedAt: '2026-04-05T00:00:00.000Z',
      receivedAmount: paidBill!.amount
    });
    store.bills.push({
      id: 'manual_bill_1',
      _id: 'db_manual_bill_1',
      landlordOpenId: 'openid-save',
      leaseId: lease.id,
      roomId: 'room_1',
      type: 'misc',
      section: 'non_rent',
      dueDate: '2026-04-15',
      amount: 66,
      status: 'pending',
      receivedAt: null,
      receivedAmount: null,
      note: '手工补录',
      source: 'manual',
      createdAt: '2026-04-05T00:00:00.000Z',
      updatedAt: '2026-04-05T00:00:00.000Z'
    });

    await leasesSaveMain({
      leaseId: lease.id,
      lease: {
        roomId: 'room_1',
        tenantId: 'tenant_1',
        startDate: '2026-04-01',
        endDate: '2026-05-31',
        billingCycleDays: 30,
        rentAmount: 1999,
        depositAmount: 1800,
        note: ''
      },
      __mockDb,
      __mockContext,
      now: '2026-04-06T00:00:00.000Z'
    });

    expect(store.bills.some((bill) => bill.id === paidBill!.id && bill.receivedAt)).toBe(true);
    expect(store.bills.some((bill) => bill.id === 'manual_bill_1')).toBe(true);
    expect(store.bills.filter((bill) => bill.leaseId === lease.id && bill.type === 'rent' && bill.amount === 1999)).toHaveLength(3);
  });

  it('allows management fee cadence to be one-time', async () => {
    const store = createMockStore();
    const __mockDb = createMockDb(store);
    const __mockContext = {
      getWXContext: () => getWXContext('openid-save')
    };
    store.rooms.push({
      id: 'room_1',
      _id: 'db_room_1',
      landlordOpenId: 'openid-save',
      assetId: 'asset_1',
      name: 'A101',
      note: '',
      isWholeUnitDefault: false,
      createdAt: '',
      updatedAt: ''
    });
    store.tenants.push({
      id: 'tenant_1',
      _id: 'db_tenant_1',
      landlordOpenId: 'openid-save',
      name: '王租客',
      phone: '',
      note: '',
      createdAt: '',
      updatedAt: ''
    });

    const lease = await leasesSaveMain({
      lease: {
        roomId: 'room_1',
        tenantId: 'tenant_1',
        startDate: '2026-04-01',
        endDate: '2026-05-31',
        billingCycleDays: 30,
        rentAmount: 1800,
        depositAmount: 1800,
        feeRules: {
          rent: { amount: 1800, cadence: 'cycle' },
          deposit: { amount: 1800, cadence: 'once' },
          management: { amount: 150 },
          customFeeItems: []
        },
        note: ''
      },
      __mockDb,
      __mockContext,
      now: '2026-04-01T00:00:00.000Z'
    });

    expect(store.bills.filter((bill) => bill.leaseId === lease.id && bill.type === 'management')).toHaveLength(3);

    await leasesSaveMain({
      leaseId: lease.id,
      lease: {
        roomId: 'room_1',
        tenantId: 'tenant_1',
        startDate: '2026-04-01',
        endDate: '2026-05-31',
        billingCycleDays: 30,
        rentAmount: 1800,
        depositAmount: 1800,
        feeRules: {
          rent: { amount: 1800, cadence: 'cycle' },
          deposit: { amount: 1800, cadence: 'once' },
          management: { amount: 150, cadence: 'once' },
          customFeeItems: []
        },
        note: ''
      },
      __mockDb,
      __mockContext,
      now: '2026-04-02T00:00:00.000Z'
    });

    const managementBills = store.bills.filter((bill) => bill.leaseId === lease.id && bill.type === 'management');

    expect(managementBills).toHaveLength(1);
    expect(managementBills[0]).toMatchObject({
      cadence: 'once',
      feeNature: 'one_time',
      isOneTime: true
    });
  });

  it('creates renewal as a new lease and keeps old lease bills untouched', async () => {
    const store = createMockStore();
    const __mockDb = createMockDb(store);
    const __mockContext = {
      getWXContext: () => getWXContext('openid-save')
    };
    store.rooms.push({
      id: 'room_1',
      landlordOpenId: 'openid-save',
      assetId: 'asset_1',
      name: 'A101',
      note: '',
      isWholeUnitDefault: false,
      createdAt: '',
      updatedAt: ''
    });
    store.tenants.push({
      id: 'tenant_1',
      landlordOpenId: 'openid-save',
      name: '王租客',
      phone: '',
      note: '',
      createdAt: '',
      updatedAt: ''
    });

    const oldLease = await leasesSaveMain({
      lease: {
        roomId: 'room_1',
        tenantId: 'tenant_1',
        startDate: '2026-01-01',
        endDate: '2026-03-31',
        billingCycleDays: 30,
        rentAmount: 1800,
        depositAmount: 1800,
        note: ''
      },
      __mockDb,
      __mockContext,
      now: '2026-01-01T00:00:00.000Z'
    });
    const oldBillIds = store.bills.filter((bill) => bill.leaseId === oldLease.id).map((bill) => bill.id);

    const renewal = await leasesSaveMain({
      lease: {
        roomId: 'room_1',
        tenantId: 'tenant_1',
        startDate: '2026-04-01',
        endDate: '2026-06-30',
        billingCycleDays: 30,
        rentAmount: 1900,
        depositAmount: 0,
        feeRules: {
          rent: { amount: 1900, cadence: 'cycle' },
          deposit: { amount: 0, cadence: 'once' },
          management: { amount: 120, cadence: 'cycle' },
          customFeeItems: [
            {
              key: 'custom_cleaning',
              label: '卫生费',
              amount: 30,
              cadence: 'cycle',
              feeNature: 'recurring'
            }
          ]
        },
        note: ''
      },
      __mockDb,
      __mockContext,
      now: '2026-03-20T00:00:00.000Z'
    });

    expect(renewal.id).not.toBe(oldLease.id);
    expect(store.leases.map((lease) => lease.id)).toEqual([oldLease.id, renewal.id]);
    expect(store.bills.filter((bill) => oldBillIds.includes(bill.id))).toHaveLength(oldBillIds.length);
    expect(store.bills.some((bill) => bill.leaseId === renewal.id && bill.amount === 1900)).toBe(true);
    expect(store.bills.some((bill) => bill.leaseId === renewal.id && bill.type === 'deposit')).toBe(false);
    expect(store.bills.some((bill) => bill.leaseId === renewal.id && bill.type === 'management')).toBe(true);
    expect(store.bills.some((bill) => bill.leaseId === renewal.id && bill.itemLabel === '卫生费')).toBe(true);
    expect(store.bills.every((bill) => bill.leaseId === oldLease.id || bill.leaseId === renewal.id)).toBe(true);
  });
});
