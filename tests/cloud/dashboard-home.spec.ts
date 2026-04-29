import { main as dashboardHomeMain } from '../../cloudfunctions/dashboard-home/index';
import { createMockDb, createMockStore } from '../helpers/mock-cloud';

describe('dashboard-home cloud function', () => {
  it('does not remove alerts from another landlord while returning overviewCards, abnormal rows, recommendation and subscriptionState', async () => {
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
      },
      {
        id: 'room_3',
        landlordOpenId: 'openid',
        assetId: 'asset_1',
        name: 'A103',
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
    store.repairRecords.push(
      {
        id: 'repair_1',
        landlordOpenId: 'openid',
        assetId: 'asset_1',
        roomId: 'room_3',
        leaseId: null,
        tenantId: null,
        category: 'plumbing',
        note: '厨房下水堵塞',
        occurredAt: '2026-03-20',
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'repair_2',
        landlordOpenId: 'openid',
        assetId: 'asset_1',
        roomId: 'room_3',
        leaseId: null,
        tenantId: null,
        category: 'electrical',
        note: '空开频繁跳闸',
        occurredAt: '2026-03-28',
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'repair_3',
        landlordOpenId: 'openid',
        assetId: 'asset_1',
        roomId: 'room_3',
        leaseId: null,
        tenantId: null,
        category: 'appliance',
        note: '热水器故障',
        occurredAt: '2026-04-06',
        createdAt: '',
        updatedAt: ''
      }
    );
    store.abnormalFlags.push({
      id: 'flag_1',
      landlordOpenId: 'openid',
      roomId: 'room_2',
      source: 'manual',
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
    store.alerts.push({
      id: 'alert_other',
      landlordOpenId: 'openid_other',
      type: 'manual_abnormal',
      level: 'high',
      roomId: 'room_other',
      summary: '其他房东的异常',
      sourceId: 'flag_other',
      createdAt: '',
      updatedAt: ''
    });

    const result = await dashboardHomeMain({
      __mockDb: createMockDb(store),
      __mockContext: { getWXContext: () => ({ OPENID: 'openid' }) },
      now: '2026-04-10T00:00:00.000Z'
    });

    expect(result.overviewCards).toHaveLength(4);
    expect(result.overviewCards.find((item: { key: string }) => item.key === 'overdue')?.count).toBe(1);
    expect(result.overviewCards.find((item: { key: string }) => item.key === 'vacancy_long')?.count).toBe(1);
    expect(result.overviewCards.find((item: { key: string }) => item.key === 'manual_abnormal')?.count).toBe(2);
    expect(result.abnormalRows[0]?.primaryReason).toContain('逾期');
    expect(result.abnormalRows[0]?.reasonLabel).toBe('已逾期');
    expect(result.abnormalRows.some((item: { supportingText: string }) => item.supportingText.includes('近 30 天维修 3 次'))).toBe(true);
    expect(result.recommendation).not.toBeNull();
    expect(result.recommendation!.title).toContain('优先处理');
    expect(result.recommendation!.actionLabel).toBe('立即处理');
    expect(result.subscriptionState).toMatchObject({
      hasRequested: true,
      enabledRuleTypes: ['overdue', 'manual_abnormal']
    });
    expect(store.alerts.some((item) => item.landlordOpenId === 'openid_other' && item.id === 'alert_other')).toBe(true);
  });
});
