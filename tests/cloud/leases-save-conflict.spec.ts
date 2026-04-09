import { main as leasesEndMain } from '../../cloudfunctions/leases-end/index';
import { main as leasesSaveMain } from '../../cloudfunctions/leases-save/index';
import { createMockDb, createMockStore, getWXContext } from '../helpers/mock-cloud';

describe('leases-save conflict guard', () => {
  it('rejects overlapped lease periods for the same room', async () => {
    const store = createMockStore();
    const __mockDb = createMockDb(store);
    const __mockContext = {
      getWXContext: () => getWXContext('openid-lease-conflict')
    };
    store.rooms.push({
      id: 'room_1',
      landlordOpenId: 'openid-lease-conflict',
      assetId: 'asset_1',
      name: 'A101',
      note: '',
      isWholeUnitDefault: false,
      createdAt: '',
      updatedAt: ''
    });
    store.tenants.push(
      {
        id: 'tenant_1',
        landlordOpenId: 'openid-lease-conflict',
        name: '租客一',
        phone: '',
        note: '',
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'tenant_2',
        landlordOpenId: 'openid-lease-conflict',
        name: '租客二',
        phone: '',
        note: '',
        createdAt: '',
        updatedAt: ''
      }
    );

    await leasesSaveMain({
      lease: {
        roomId: 'room_1',
        tenantId: 'tenant_1',
        startDate: '2026-04-01',
        endDate: '2026-07-31',
        billingCycleDays: 30,
        rentAmount: 2800,
        depositAmount: 2800,
        note: ''
      },
      __mockDb,
      __mockContext,
      now: '2026-04-01T00:00:00.000Z'
    });

    await expect(
      leasesSaveMain({
        lease: {
          roomId: 'room_1',
          tenantId: 'tenant_2',
          startDate: '2026-06-01',
          endDate: '2026-08-31',
          billingCycleDays: 30,
          rentAmount: 2900,
          depositAmount: 2900,
          note: ''
        },
        __mockDb,
        __mockContext,
        now: '2026-04-02T00:00:00.000Z'
      })
    ).rejects.toThrow('租约时间冲突');

    expect(store.leases).toHaveLength(1);
  });

  it('allows next lease after an early-terminated lease actual end date', async () => {
    const store = createMockStore();
    const __mockDb = createMockDb(store);
    const __mockContext = {
      getWXContext: () => getWXContext('openid-lease-conflict')
    };
    store.rooms.push({
      id: 'room_1',
      landlordOpenId: 'openid-lease-conflict',
      assetId: 'asset_1',
      name: 'A101',
      note: '',
      isWholeUnitDefault: false,
      createdAt: '',
      updatedAt: ''
    });
    store.tenants.push(
      {
        id: 'tenant_1',
        landlordOpenId: 'openid-lease-conflict',
        name: '租客一',
        phone: '',
        note: '',
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'tenant_2',
        landlordOpenId: 'openid-lease-conflict',
        name: '租客二',
        phone: '',
        note: '',
        createdAt: '',
        updatedAt: ''
      }
    );

    const lease = await leasesSaveMain({
      lease: {
        roomId: 'room_1',
        tenantId: 'tenant_1',
        startDate: '2026-04-01',
        endDate: '2026-12-31',
        billingCycleDays: 30,
        rentAmount: 2800,
        depositAmount: 2800,
        note: ''
      },
      __mockDb,
      __mockContext,
      now: '2026-04-01T00:00:00.000Z'
    });

    await leasesEndMain({
      leaseId: lease.id,
      __mockDb,
      __mockContext,
      now: '2026-04-15T00:00:00.000Z'
    });

    await expect(
      leasesSaveMain({
        lease: {
          roomId: 'room_1',
          tenantId: 'tenant_2',
          startDate: '2026-04-16',
          endDate: '2026-08-31',
          billingCycleDays: 30,
          rentAmount: 2900,
          depositAmount: 2900,
          note: ''
        },
        __mockDb,
        __mockContext,
        now: '2026-04-16T00:00:00.000Z'
      })
    ).resolves.toMatchObject({
      roomId: 'room_1',
      tenantId: 'tenant_2'
    });

    expect(store.leases).toHaveLength(2);
  });

  it('does not leave orphan tenant when inline tenant lease save conflicts', async () => {
    const store = createMockStore();
    const __mockDb = createMockDb(store);
    const __mockContext = {
      getWXContext: () => getWXContext('openid-lease-conflict')
    };
    store.rooms.push({
      id: 'room_1',
      landlordOpenId: 'openid-lease-conflict',
      assetId: 'asset_1',
      name: 'A101',
      note: '',
      isWholeUnitDefault: false,
      createdAt: '',
      updatedAt: ''
    });
    store.tenants.push({
      id: 'tenant_1',
      landlordOpenId: 'openid-lease-conflict',
      name: '租客一',
      phone: '',
      note: '',
      createdAt: '',
      updatedAt: ''
    });

    await leasesSaveMain({
      lease: {
        roomId: 'room_1',
        tenantId: 'tenant_1',
        startDate: '2026-04-01',
        endDate: '2026-07-31',
        billingCycleDays: 30,
        rentAmount: 2800,
        depositAmount: 2800,
        note: ''
      },
      __mockDb,
      __mockContext,
      now: '2026-04-01T00:00:00.000Z'
    });

    await expect(
      leasesSaveMain({
        lease: {
          roomId: 'room_1',
          startDate: '2026-06-01',
          endDate: '2026-08-31',
          billingCycleDays: 30,
          rentAmount: 2900,
          depositAmount: 2900,
          note: ''
        },
        tenant: {
          name: '冲突租客',
          phone: '13800000000',
          note: ''
        },
        __mockDb,
        __mockContext,
        now: '2026-04-02T00:00:00.000Z'
      } as any)
    ).rejects.toThrow('租约时间冲突');

    expect(store.leases).toHaveLength(1);
    expect(store.tenants).toHaveLength(1);
    expect(store.tenants[0]?.name).toBe('租客一');
  });
});
