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
      },
      {
        id: 'room_4',
        landlordOpenId: 'openid',
        assetId: 'asset_1',
        name: 'A104',
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
      source: 'manual',
      active: true,
      reason: '手动报修',
      createdAt: '',
      updatedAt: '',
      clearedAt: null
    });
    store.repairRecords.push(
      {
        id: 'repair_1',
        landlordOpenId: 'openid',
        assetId: 'asset_1',
        roomId: 'room_4',
        leaseId: null,
        tenantId: null,
        category: 'plumbing',
        note: '厨房水管漏水',
        occurredAt: '2026-03-10',
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'repair_2',
        landlordOpenId: 'openid',
        assetId: 'asset_1',
        roomId: 'room_4',
        leaseId: null,
        tenantId: null,
        category: 'electrical',
        note: '墙插短路',
        occurredAt: '2026-03-20',
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'repair_3',
        landlordOpenId: 'openid',
        assetId: 'asset_1',
        roomId: 'room_4',
        leaseId: null,
        tenantId: null,
        category: 'appliance',
        note: '热水器维修',
        occurredAt: '2026-03-25',
        createdAt: '',
        updatedAt: ''
      }
    );

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
    expect(
      result.groups
        .find((group: { type: string }) => group.type === 'manual_abnormal')
        ?.items.some((item: { summary: string }) => item.summary.includes('近 30 天维修 3 次'))
    ).toBe(true);
  });
});
