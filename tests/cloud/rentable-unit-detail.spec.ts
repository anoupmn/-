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
    expect(result.leaseHistory[0]?.originalEndDate).toBe('2026-02-28');
    expect(result.leaseHistory[0]?.actualEndDate).toBe('2026-02-28');
    expect(result.leaseHistory[0]?.terminationRemark).toBe('期满结束租约');
  });

  it('resolves historical tenant name when lease.tenantId stores legacy tenant _id', async () => {
    const store = createMockStore();
    store.assets.push({
      id: 'asset_legacy',
      landlordOpenId: 'openid',
      name: '星海公寓',
      rentalMode: 'room',
      address: '',
      note: '',
      createdAt: '',
      updatedAt: ''
    });
    store.rooms.push({
      id: 'room_legacy',
      landlordOpenId: 'openid',
      assetId: 'asset_legacy',
      name: 'B1',
      note: '',
      isWholeUnitDefault: false,
      createdAt: '',
      updatedAt: ''
    });
    store.tenants.push({
      id: 'tenant_business_1',
      _id: 'tenant_doc_legacy_1',
      landlordOpenId: 'openid',
      name: '历史租客',
      phone: '',
      note: '',
      createdAt: '',
      updatedAt: ''
    });
    store.leases.push({
      id: 'lease_legacy_1',
      landlordOpenId: 'openid',
      roomId: 'room_legacy',
      tenantId: 'tenant_doc_legacy_1',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      billingCycleDays: 30,
      rentAmount: 2600,
      depositAmount: 2600,
      note: '',
      closedAt: '2025-12-31T00:00:00.000Z',
      createdAt: '',
      updatedAt: ''
    });

    const result = await rentableUnitDetailMain({
      roomId: 'room_legacy',
      __mockDb: createMockDb(store),
      now: '2026-04-01T00:00:00.000Z'
    });

    expect(result.leaseHistory).toHaveLength(1);
    expect(result.leaseHistory[0]?.tenantName).toBe('历史租客');
  });

  it('returns original and actual period when lease ends early', async () => {
    const store = createMockStore();
    store.assets.push({
      id: 'asset_early',
      landlordOpenId: 'openid',
      name: '天悦公寓',
      rentalMode: 'room',
      address: '',
      note: '',
      createdAt: '',
      updatedAt: ''
    });
    store.rooms.push({
      id: 'room_early',
      landlordOpenId: 'openid',
      assetId: 'asset_early',
      name: 'C1',
      note: '',
      isWholeUnitDefault: false,
      createdAt: '',
      updatedAt: ''
    });
    store.tenants.push({
      id: 'tenant_early',
      landlordOpenId: 'openid',
      name: '提前退租租客',
      phone: '',
      note: '',
      createdAt: '',
      updatedAt: ''
    });
    store.leases.push({
      id: 'lease_early',
      landlordOpenId: 'openid',
      roomId: 'room_early',
      tenantId: 'tenant_early',
      startDate: '2026-01-01',
      endDate: '2026-07-31',
      billingCycleDays: 30,
      rentAmount: 2800,
      depositAmount: 2800,
      note: '',
      closedAt: '2026-04-15T10:30:00.000Z',
      createdAt: '',
      updatedAt: ''
    });

    const result = await rentableUnitDetailMain({
      roomId: 'room_early',
      __mockDb: createMockDb(store),
      now: '2026-04-20T00:00:00.000Z'
    });

    expect(result.leaseHistory).toHaveLength(1);
    expect(result.leaseHistory[0]?.originalEndDate).toBe('2026-07-31');
    expect(result.leaseHistory[0]?.actualEndDate).toBe('2026-04-15');
    expect(result.leaseHistory[0]?.isEarlyTerminated).toBe(true);
    expect(result.leaseHistory[0]?.terminationRemark).toBe('提前结束租约');
  });
});
