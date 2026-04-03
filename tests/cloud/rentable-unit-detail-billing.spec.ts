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
        receivedAmount: 2600,
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
        note: '',
        createdAt: '',
        updatedAt: ''
      }
    );

    const result = await rentableUnitDetailMain({
      roomId: 'room_1',
      __mockDb: createMockDb(store),
      now: '2026-04-01T00:00:00.000Z'
    });

    expect(result.summaryCard.mainStatusLabel).toBe('已出租');
    expect(result.summaryCard.currentTenantName).toBe('李租客');
    expect(result.monthlyBillGroups).toHaveLength(1);
    expect(result.monthlyBillGroups[0].monthLabel).toBe('2026年04月');
    expect(result.monthlyBillGroups[0].items.map((item) => item.label)).toEqual(['押金', '租金', '水费']);
    expect(result.monthlyBillGroups[0].items[1].status).toBe(BILL_STATUSES.pending);
    expect(result.historyCollapsedByDefault).toBe(true);
  });
});
