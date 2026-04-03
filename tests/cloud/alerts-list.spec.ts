import { main as alertsListMain } from '../../cloudfunctions/alerts-list/index';
import { createMockDb, createMockStore } from '../helpers/mock-cloud';

describe('alerts-list cloud function', () => {
  it('returns groups by rule type including manual_abnormal', async () => {
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
    store.leases.push({
      id: 'lease_1',
      landlordOpenId: 'openid',
      roomId: 'room_1',
      tenantId: 'tenant_1',
      startDate: '2026-03-01',
      endDate: '2026-04-12',
      billingCycleDays: 30,
      rentAmount: 2800,
      depositAmount: 2800,
      note: '',
      closedAt: null,
      createdAt: '',
      updatedAt: ''
    });
    store.leases.push({
      id: 'lease_2',
      landlordOpenId: 'openid',
      roomId: 'room_3',
      tenantId: 'tenant_1',
      startDate: '2026-04-01',
      endDate: '2026-04-12',
      billingCycleDays: 30,
      rentAmount: 2600,
      depositAmount: 2600,
      note: '',
      closedAt: null,
      createdAt: '',
      updatedAt: ''
    });
    store.abnormalFlags.push({
      id: 'flag_1',
      landlordOpenId: 'openid',
      roomId: 'room_2',
      active: true,
      reason: '手动报修',
      createdAt: '',
      updatedAt: '',
      clearedAt: null
    });

    const result = await alertsListMain({
      __mockDb: createMockDb(store),
      now: '2026-04-01T00:00:00.000Z'
    });

    expect(result.groups.map((group: { type: string }) => group.type)).toEqual(
      expect.arrayContaining(['expiring', 'manual_abnormal'])
    );
    expect(result.groups.find((group: { type: string }) => group.type === 'manual_abnormal')?.items[0]?.summary).toContain(
      '手动报修'
    );
  });
});
