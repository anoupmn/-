import { main as rentableUnitDetailMain } from '../../cloudfunctions/rentable-unit-detail/index';
import { BILL_STATUSES } from '../../cloudfunctions/shared/constants/statuses';
import { createMockDb, createMockStore } from '../helpers/mock-cloud';

describe('rentable-unit-detail billing view', () => {
  it('returns summaryCard, monthlyBillGroups, and default-collapsed history blocks', async () => {
    const store = createMockStore();
    store.assets.push({
      id: 'asset_1',
      landlordOpenId: 'openid',
      name: '金色家园',
      rentalMode: 'room',
      address: '',
      note: '',
      createdAt: '',
      updatedAt: ''
    });
    store.rooms.push({
      id: 'room_1',
      landlordOpenId: 'openid',
      assetId: 'asset_1',
      name: 'A1',
      note: '',
      isWholeUnitDefault: false,
      createdAt: '',
      updatedAt: ''
    });
    store.tenants.push({
      id: 'tenant_1',
      landlordOpenId: 'openid',
      name: '李租客',
      phone: '',
      note: '',
      createdAt: '',
      updatedAt: ''
    });
    store.leases.push({
      id: 'lease_1',
      landlordOpenId: 'openid',
      roomId: 'room_1',
      tenantId: 'tenant_1',
      startDate: '2026-04-01',
      endDate: '2026-06-30',
      billingCycleDays: 30,
      rentAmount: 2600,
      depositAmount: 2600,
      feeRules: {
        rent: { amount: 2600, cadence: 'cycle' },
        deposit: { amount: 2600, cadence: 'once' },
        customFeeItems: []
      },
      note: '',
      closedAt: null,
      createdAt: '',
      updatedAt: ''
    });
    store.bills.push(
      {
        id: 'bill_rent',
        landlordOpenId: 'openid',
        leaseId: 'lease_1',
        roomId: 'room_1',
        type: 'rent',
        section: 'rent',
        dueDate: '2026-04-05',
        amount: 2600,
        status: BILL_STATUSES.pending,
        receivedAt: null,
        receivedAmount: null,
        note: '',
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'bill_deposit',
        landlordOpenId: 'openid',
        leaseId: 'lease_1',
        roomId: 'room_1',
        type: 'deposit',
        section: 'deposit',
        dueDate: '2026-04-01',
        amount: 2600,
        status: BILL_STATUSES.paid,
        receivedAt: '2026-04-01T10:00:00.000Z',
        receivedAmount: 2500,
        note: '',
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'bill_water',
        landlordOpenId: 'openid',
        leaseId: 'lease_1',
        roomId: 'room_1',
        type: 'water',
        section: 'non_rent',
        dueDate: '2026-04-08',
        amount: 120,
        status: BILL_STATUSES.pending,
        receivedAt: null,
        receivedAmount: null,
        source: 'manual',
        note: '水表拍照留存',
        meterReading: {
          previousReading: 100,
          currentReading: 140,
          usage: 40,
          unitPrice: 3
        },
        createdAt: '',
        updatedAt: ''
      }
    );

    const result = await rentableUnitDetailMain({
      roomId: 'room_1',
      __mockDb: createMockDb(store),
      __mockContext: { getWXContext: () => ({ OPENID: 'openid' }) },
      now: '2026-04-01T00:00:00.000Z'
    });

    expect(result.summaryCard.mainStatusLabel).toBe('已出租');
    expect(result.summaryCard.currentTenantName).toBe('李租客');
    expect(result.monthlyBillGroups).toHaveLength(1);
    expect(result.monthlyBillGroups[0].monthLabel).toBe('2026年04月');
    expect(result.monthlyBillGroups[0].items.map((item) => item.label)).toEqual(['押金', '租金', '水费']);
    expect(result.monthlyBillGroups[0].items[1].status).toBe(BILL_STATUSES.pending);
    expect(result.monthlyBillGroups[0].items[0].isReceivedAmountMismatch).toBe(true);
    expect(result.monthlyBillGroups[0].items[2].source).toBe('manual');
    expect(result.monthlyBillGroups[0].items[2].meterReading).toEqual({
      previousReading: 100,
      currentReading: 140,
      usage: 40,
      unitPrice: 3
    });
    expect(result.monthlyBillGroups[0].items[2].note).toBe('水表拍照留存');
    expect(result.historyCollapsedByDefault).toBe(true);
  });

  it('returns previous meter reading defaults for water and electricity', async () => {
    const store = createMockStore();
    store.assets.push({
      id: 'asset_1',
      landlordOpenId: 'openid',
      name: '金色家园',
      rentalMode: 'room',
      address: '',
      note: '',
      createdAt: '',
      updatedAt: ''
    });
    store.rooms.push({
      id: 'room_1',
      landlordOpenId: 'openid',
      assetId: 'asset_1',
      name: 'A1',
      note: '',
      isWholeUnitDefault: false,
      createdAt: '',
      updatedAt: ''
    });
    store.tenants.push({
      id: 'tenant_1',
      landlordOpenId: 'openid',
      name: '李租客',
      phone: '',
      note: '',
      createdAt: '',
      updatedAt: ''
    });
    store.leases.push({
      id: 'lease_1',
      landlordOpenId: 'openid',
      roomId: 'room_1',
      tenantId: 'tenant_1',
      startDate: '2026-04-01',
      endDate: '2026-06-30',
      billingCycleDays: 30,
      rentAmount: 2600,
      depositAmount: 2600,
      feeRules: {
        rent: { amount: 2600, cadence: 'cycle' },
        deposit: { amount: 2600, cadence: 'once' },
        management: { amount: 0, cadence: 'cycle' },
        fireDeposit: { amount: 0, cadence: 'once' },
        lockCardDeposit: { amount: 0, cadence: 'once' },
        customFeeItems: []
      },
      note: '',
      closedAt: null,
      createdAt: '',
      updatedAt: ''
    });
    store.bills.push(
      {
        id: 'bill_water_old',
        landlordOpenId: 'openid',
        leaseId: 'lease_1',
        roomId: 'room_1',
        type: 'water',
        section: 'non_rent',
        dueDate: '2026-03-01',
        amount: 90,
        status: BILL_STATUSES.paid,
        receivedAt: '2026-03-05T00:00:00.000Z',
        receivedAmount: 90,
        source: 'manual',
        note: '',
        meterReading: {
          previousReading: 80,
          currentReading: 110,
          usage: 30,
          unitPrice: 3
        },
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'bill_water_new',
        landlordOpenId: 'openid',
        leaseId: 'lease_1',
        roomId: 'room_1',
        type: 'water',
        section: 'non_rent',
        dueDate: '2026-04-01',
        amount: 99,
        status: BILL_STATUSES.pending,
        receivedAt: null,
        receivedAmount: null,
        source: 'manual',
        note: '',
        meterReading: {
          previousReading: 110,
          currentReading: 143,
          usage: 33,
          unitPrice: 3
        },
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'bill_electricity',
        landlordOpenId: 'openid',
        leaseId: 'lease_1',
        roomId: 'room_1',
        type: 'electricity',
        section: 'non_rent',
        dueDate: '2026-04-01',
        amount: 48,
        status: BILL_STATUSES.pending,
        receivedAt: null,
        receivedAmount: null,
        source: 'manual',
        note: '',
        meterReading: {
          previousReading: 220,
          currentReading: 280,
          usage: 60,
          unitPrice: 0.8
        },
        createdAt: '',
        updatedAt: ''
      }
    );

    const result = await rentableUnitDetailMain({
      roomId: 'room_1',
      __mockDb: createMockDb(store),
      __mockContext: { getWXContext: () => ({ OPENID: 'openid' }) },
      now: '2026-04-10T00:00:00.000Z'
    });

    expect(result.meterDefaults).toEqual({
      water: {
        previousReading: 143,
        unitPrice: 3
      },
      electricity: {
        previousReading: 280,
        unitPrice: 0.8
      }
    });
  });

  it('does not backfill bills during detail read when active lease has no bill records', async () => {
    const store = createMockStore();
    store.assets.push({
      id: 'asset_1',
      landlordOpenId: 'openid',
      name: '金色家园',
      rentalMode: 'room',
      address: '',
      note: '',
      createdAt: '',
      updatedAt: ''
    });
    store.rooms.push({
      id: 'room_1',
      landlordOpenId: 'openid',
      assetId: 'asset_1',
      name: 'A1',
      note: '',
      isWholeUnitDefault: false,
      createdAt: '',
      updatedAt: ''
    });
    store.tenants.push({
      id: 'tenant_1',
      landlordOpenId: 'openid',
      name: '李租客',
      phone: '',
      note: '',
      createdAt: '',
      updatedAt: ''
    });
    store.leases.push({
      id: 'lease_1',
      landlordOpenId: 'openid',
      roomId: 'room_1',
      tenantId: 'tenant_1',
      startDate: '2026-04-01',
      endDate: '2026-06-30',
      billingCycleDays: 30,
      rentAmount: 2600,
      depositAmount: 2600,
      feeRules: {
        rent: { amount: 2600, cadence: 'cycle' },
        deposit: { amount: 2600, cadence: 'once' },
        customFeeItems: []
      },
      note: '',
      closedAt: null,
      createdAt: '',
      updatedAt: ''
    });

    const result = await rentableUnitDetailMain({
      roomId: 'room_1',
      __mockDb: createMockDb(store),
      __mockContext: { getWXContext: () => ({ OPENID: 'openid' }) },
      now: '2026-04-01T00:00:00.000Z'
    });

    expect(result.monthlyBillGroups).toEqual([]);
    expect(store.bills).toHaveLength(0);
    expect(result.summaryCard.nextReceivableAmount).toBe(2600);
  });
});
