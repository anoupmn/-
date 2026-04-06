import { main as rentableUnitDetailMain } from '../../cloudfunctions/rentable-unit-detail/index';
import { createMockDb, createMockStore } from '../helpers/mock-cloud';

describe('rentable-unit-detail cloud function', () => {
  it('returns asset, room, active lease, historical leaseHistory and tenantHistory', async () => {
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
    store.tenants.push(
      {
        id: 'tenant_1',
        landlordOpenId: 'openid',
        name: '李一',
        phone: '',
        note: '',
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'tenant_2',
        landlordOpenId: 'openid',
        name: '李二',
        phone: '',
        note: '',
        createdAt: '',
        updatedAt: ''
      }
    );
    store.leases.push(
      {
        id: 'lease_1',
        landlordOpenId: 'openid',
        roomId: 'room_1',
        tenantId: 'tenant_1',
        startDate: '2026-01-01',
        endDate: '2026-02-28',
        billingCycleDays: 30,
        rentAmount: 2000,
        depositAmount: 2000,
        note: '',
        closedAt: '2026-02-28T00:00:00.000Z',
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'lease_2',
        landlordOpenId: 'openid',
        roomId: 'room_1',
        tenantId: 'tenant_2',
        startDate: '2026-03-01',
        endDate: '2026-05-31',
        billingCycleDays: 30,
        rentAmount: 2200,
        depositAmount: 2200,
        note: '',
        closedAt: null,
        createdAt: '',
        updatedAt: ''
      }
    );

    const result = await rentableUnitDetailMain({
      roomId: 'room_1',
      __mockDb: createMockDb(store),
      now: '2026-04-01T00:00:00.000Z'
    });

    expect(result.activeLease?.id).toBe('lease_2');
    expect(result.tenantHistory.map((tenant) => tenant.name)).toEqual(['李一', '李二']);
    expect(result.leaseHistory).toHaveLength(1);
    expect(result.leaseHistory[0]?.id).toBe('lease_1');
  });
});
