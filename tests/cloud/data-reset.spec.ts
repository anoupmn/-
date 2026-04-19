import { main as dataResetMain } from '../../cloudfunctions/data-reset/index';
import { createMockDb, createMockStore, getWXContext } from '../helpers/mock-cloud';

describe('data-reset cloud function', () => {
  it('requires confirm token', async () => {
    const store = createMockStore();

    await expect(
      dataResetMain({
        __mockDb: createMockDb(store),
        __mockContext: {
          getWXContext: () => getWXContext('openid')
        }
      })
    ).rejects.toThrow('Invalid confirmToken');
  });

  it('removes only current landlord scoped records', async () => {
    const store = createMockStore();

    store.assets.push(
      { id: 'asset_a', landlordOpenId: 'openid_a' },
      { id: 'asset_b', landlordOpenId: 'openid_b' }
    );
    store.rooms.push(
      { id: 'room_a', landlordOpenId: 'openid_a' },
      { id: 'room_b', landlordOpenId: 'openid_b' }
    );
    store.tenants.push(
      { id: 'tenant_a', landlordOpenId: 'openid_a' },
      { id: 'tenant_b', landlordOpenId: 'openid_b' }
    );
    store.leases.push(
      { id: 'lease_a', landlordOpenId: 'openid_a' },
      { id: 'lease_b', landlordOpenId: 'openid_b' }
    );
    store.bills.push(
      { id: 'bill_a', landlordOpenId: 'openid_a' },
      { id: 'bill_b', landlordOpenId: 'openid_b' }
    );
    store.repairRecords.push(
      { id: 'repair_a', landlordOpenId: 'openid_a' },
      { id: 'repair_b', landlordOpenId: 'openid_b' }
    );
    store.abnormalFlags.push(
      { id: 'flag_a', landlordOpenId: 'openid_a' },
      { id: 'flag_b', landlordOpenId: 'openid_b' }
    );
    store.notificationPreferences.push(
      { id: 'pref_a', landlordOpenId: 'openid_a' },
      { id: 'pref_b', landlordOpenId: 'openid_b' }
    );
    store.alerts.push(
      { id: 'alert_a', landlordOpenId: 'openid_a' },
      { id: 'alert_b', landlordOpenId: 'openid_b' }
    );

    const result = await dataResetMain({
      confirmToken: 'RESET_MY_TEST_DATA',
      __mockDb: createMockDb(store),
      __mockContext: {
        getWXContext: () => getWXContext('openid_a')
      }
    });

    expect(result.totalRemoved).toBe(9);
    expect(store.assets.map((item) => item.id)).toEqual(['asset_b']);
    expect(store.rooms.map((item) => item.id)).toEqual(['room_b']);
    expect(store.tenants.map((item) => item.id)).toEqual(['tenant_b']);
    expect(store.leases.map((item) => item.id)).toEqual(['lease_b']);
    expect(store.bills.map((item) => item.id)).toEqual(['bill_b']);
    expect(store.repairRecords.map((item) => item.id)).toEqual(['repair_b']);
    expect(store.abnormalFlags.map((item) => item.id)).toEqual(['flag_b']);
    expect(store.notificationPreferences.map((item) => item.id)).toEqual(['pref_b']);
    expect(store.alerts.map((item) => item.id)).toEqual(['alert_b']);
  });

  it('supports removing all users records when scope=all', async () => {
    const store = createMockStore();

    store.assets.push(
      { id: 'asset_a', landlordOpenId: 'openid_a' },
      { id: 'asset_b', landlordOpenId: 'openid_b' }
    );
    store.rooms.push(
      { id: 'room_a', landlordOpenId: 'openid_a' },
      { id: 'room_b', landlordOpenId: 'openid_b' }
    );
    store.tenants.push(
      { id: 'tenant_a', landlordOpenId: 'openid_a' },
      { id: 'tenant_b', landlordOpenId: 'openid_b' }
    );
    store.leases.push(
      { id: 'lease_a', landlordOpenId: 'openid_a' },
      { id: 'lease_b', landlordOpenId: 'openid_b' }
    );
    store.bills.push(
      { id: 'bill_a', landlordOpenId: 'openid_a' },
      { id: 'bill_b', landlordOpenId: 'openid_b' }
    );
    store.repairRecords.push(
      { id: 'repair_a', landlordOpenId: 'openid_a' },
      { id: 'repair_b', landlordOpenId: 'openid_b' }
    );
    store.abnormalFlags.push(
      { id: 'flag_a', landlordOpenId: 'openid_a' },
      { id: 'flag_b', landlordOpenId: 'openid_b' }
    );
    store.notificationPreferences.push(
      { id: 'pref_a', landlordOpenId: 'openid_a' },
      { id: 'pref_b', landlordOpenId: 'openid_b' }
    );
    store.alerts.push(
      { id: 'alert_a', landlordOpenId: 'openid_a' },
      { id: 'alert_b', landlordOpenId: 'openid_b' }
    );

    const result = await dataResetMain({
      scope: 'all',
      confirmToken: 'RESET_ALL_TEST_DATA',
      __mockDb: createMockDb(store),
      __mockContext: {
        getWXContext: () => getWXContext('openid_a')
      }
    });

    expect(result.scope).toBe('all');
    expect(result.totalRemoved).toBe(18);
    expect(store.assets).toHaveLength(0);
    expect(store.rooms).toHaveLength(0);
    expect(store.tenants).toHaveLength(0);
    expect(store.leases).toHaveLength(0);
    expect(store.bills).toHaveLength(0);
    expect(store.repairRecords).toHaveLength(0);
    expect(store.abnormalFlags).toHaveLength(0);
    expect(store.notificationPreferences).toHaveLength(0);
    expect(store.alerts).toHaveLength(0);
  });
});
