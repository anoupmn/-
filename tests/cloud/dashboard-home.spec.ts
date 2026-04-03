import { main as dashboardHomeMain } from '../../cloudfunctions/dashboard-home/index';
import { createMockDb, createMockStore } from '../helpers/mock-cloud';

describe('dashboard-home cloud function', () => {
  it('returns overviewCards, abnormal rows, recommendation and subscriptionState from shared alerts', async () => {
    const store = createMockStore();
    store.assets.push({
      id: 'asset_1',
      landlordOpenId: 'openid',
      name: '虹桥公寓',
      rentalMode: 'room',
      address: '',
      note: '',
      createdAt: '',
      updatedAt: ''
    });
    store.rooms.push(
      {
        id: 'room_1',
        landlordOpenId: 'openid',
        assetId: 'asset_1',
        name: 'A101',
        note: '',
        isWholeUnitDefault: false,
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'room_2',
        landlordOpenId: 'openid',
        assetId: 'asset_1',
        name: 'A102',
        note: '',
        isWholeUnitDefault: false,
        createdAt: '',
        updatedAt: ''
      }
    );
    store.tenants.push({
      id: 'tenant_1',
      landlordOpenId: 'openid',
      name: '王租客',
      phone: '',
      note: '',
      createdAt: '',
      updatedAt: ''
    });
    store.leases.push(
      {
        id: 'lease_1',
        landlordOpenId: 'openid',
        roomId: 'room_1',
        tenantId: 'tenant_1',
        startDate: '2026-03-01',
        endDate: '2026-06-30',
        billingCycleDays: 30,
        rentAmount: 2800,
        depositAmount: 2800,
        note: '',
        closedAt: null,
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'lease_2',
        landlordOpenId: 'openid',
        roomId: 'room_2',
        tenantId: 'tenant_1',
        startDate: '2026-01-01',
        endDate: '2026-02-20',
        billingCycleDays: 30,
        rentAmount: 2600,
        depositAmount: 2600,
        note: '',
        closedAt: '2026-02-20T00:00:00.000Z',
        createdAt: '',
        updatedAt: ''
      }
    );
    store.bills.push({
      id: 'bill_1',
      landlordOpenId: 'openid',
      leaseId: 'lease_1',
      roomId: 'room_1',
      type: 'rent',
      section: 'rent',
      dueDate: '2026-03-20',
      amount: 2800,
      status: 'pending',
      receivedAt: null,
      receivedAmount: null,
      createdAt: '',
      updatedAt: ''
    });
    store.abnormalFlags.push({
      id: 'flag_1',
      landlordOpenId: 'openid',
      roomId: 'room_2',
      active: true,
      reason: '门锁损坏',
      createdAt: '',
      updatedAt: '',
      clearedAt: null
    });
    store.notificationPreferences.push({
      id: 'pref_1',
      landlordOpenId: 'openid',
      consentState: 'accepted',
      hasRequested: true,
      enabledRuleTypes: ['overdue', 'manual_abnormal'],
      createdAt: '',
      updatedAt: ''
    });

    const result = await dashboardHomeMain({
      __mockDb: createMockDb(store),
      __mockContext: { getWXContext: () => ({ OPENID: 'openid' }) },
      now: '2026-04-10T00:00:00.000Z'
    });

    expect(result.overviewCards).toHaveLength(3);
    expect(result.overviewCards.find((item: { key: string }) => item.key === 'abnormal')?.count).toBe(2);
    expect(result.abnormalRows[0]?.primaryReason).toContain('逾期');
    expect(result.recommendation).not.toBeNull();
    expect(result.recommendation!.title).toContain('优先处理');
    expect(result.recommendation!.actionLabel).toBe('立即处理');
    expect(result.subscriptionState).toMatchObject({
      hasRequested: true,
      enabledRuleTypes: ['overdue', 'manual_abnormal']
    });
  });
});
