import { main as rentableUnitsListMain } from '../../cloudfunctions/rentable-units-list/index';
import { createMockDb, createMockStore } from '../helpers/mock-cloud';

describe('rentable-units-list cloud function', () => {
  it('returns summary rows with nextReceivableAmount', async () => {
    const store = createMockStore();
    store.assets.push({
      id: 'asset_1',
      landlordOpenId: 'openid',
      name: '金色家园',
      rentalMode: 'whole',
      address: '',
      note: '',
      createdAt: '',
      updatedAt: ''
    });
    store.rooms.push({
      id: 'room_1',
      landlordOpenId: 'openid',
      assetId: 'asset_1',
      name: '整租单元',
      note: '',
      isWholeUnitDefault: true,
      createdAt: '',
      updatedAt: ''
    });
    store.tenants.push({
      id: 'tenant_1',
      landlordOpenId: 'openid',
      name: '陈租客',
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
      endDate: '2026-05-31',
      billingCycleDays: 30,
      rentAmount: 2600,
      depositAmount: 2600,
      note: '',
      closedAt: null,
      createdAt: '',
      updatedAt: ''
    });

    const result = await rentableUnitsListMain({
      __mockDb: createMockDb(store),
      __mockContext: { getWXContext: () => ({ OPENID: 'openid' }) },
      now: '2026-04-01T00:00:00.000Z'
    });

    expect(result[0]).toMatchObject({
      currentTenantName: '陈租客',
      nextReceivableAmount: 2600
    });
  });

  it('returns only current landlord units', async () => {
    const store = createMockStore();
    store.assets.push(
      {
        id: 'asset_1',
        landlordOpenId: 'openid_A',
        name: 'A 资产',
        rentalMode: 'whole',
        address: '',
        note: '',
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'asset_2',
        landlordOpenId: 'openid_B',
        name: 'B 资产',
        rentalMode: 'whole',
        address: '',
        note: '',
        createdAt: '',
        updatedAt: ''
      }
    );
    store.rooms.push(
      {
        id: 'room_1',
        landlordOpenId: 'openid_A',
        assetId: 'asset_1',
        name: 'A 房间',
        note: '',
        isWholeUnitDefault: true,
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'room_2',
        landlordOpenId: 'openid_B',
        assetId: 'asset_2',
        name: 'B 房间',
        note: '',
        isWholeUnitDefault: true,
        createdAt: '',
        updatedAt: ''
      }
    );

    const result = await rentableUnitsListMain({
      __mockDb: createMockDb(store),
      __mockContext: { getWXContext: () => ({ OPENID: 'openid_A' }) },
      now: '2026-04-01T00:00:00.000Z'
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.roomId).toBe('room_1');
  });
});
