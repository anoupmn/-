import { main as assetsSaveMain } from '../../cloudfunctions/assets-save/index';
import { main as roomsSaveMain } from '../../cloudfunctions/rooms-save/index';
import { main as tenantsSaveMain } from '../../cloudfunctions/tenants-save/index';
import { main as leasesSaveMain } from '../../cloudfunctions/leases-save/index';
import { main as leasesEndMain } from '../../cloudfunctions/leases-end/index';
import { createMockDb, createMockStore, getWXContext } from '../helpers/mock-cloud';

describe('entity save cloud functions', () => {
  it('creates asset with rentalMode and supports createRoom / endLease flows', async () => {
    const store = createMockStore();
    const __mockDb = createMockDb(store);
    const __mockContext = {
      getWXContext: () => getWXContext('openid-save')
    };

    const assetResult = await assetsSaveMain({
      asset: {
        name: '虹桥公寓',
        rentalMode: 'room',
        address: '',
        note: ''
      },
      __mockDb,
      __mockContext,
      now: '2026-04-01T00:00:00.000Z'
    });

    expect(assetResult.asset.rentalMode).toBe('room');

    const room = await roomsSaveMain({
      room: {
        assetId: assetResult.asset.id,
        name: 'A1',
        note: '',
        isWholeUnitDefault: false
      },
      __mockDb,
      __mockContext,
      now: '2026-04-01T00:00:00.000Z'
    });

    const tenant = await tenantsSaveMain({
      tenant: {
        name: '测试租客',
        phone: '',
        note: ''
      },
      __mockDb,
      __mockContext,
      now: '2026-04-01T00:00:00.000Z'
    });

    const lease = await leasesSaveMain({
      lease: {
        roomId: room.id,
        tenantId: tenant.id,
        startDate: '2026-04-01',
        endDate: '2026-07-31',
        billingCycleDays: 30,
        rentAmount: 1800,
        depositAmount: 1800,
        note: ''
      },
      __mockDb,
      __mockContext,
      now: '2026-04-01T00:00:00.000Z'
    });

    const ended = await leasesEndMain({
      leaseId: lease.id,
      __mockDb,
      __mockContext,
      now: '2026-04-15T00:00:00.000Z'
    });

    expect(room.id).toContain('room_');
    expect(ended.lease.closedAt).toBe('2026-04-15T00:00:00.000Z');
  });
});
