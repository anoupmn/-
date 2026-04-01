import { main as quickEntryMain } from '../../cloudfunctions/quick-entry/index';
import { createMockDb, createMockStore, getWXContext } from '../helpers/mock-cloud';

describe('quick-entry cloud function', () => {
  it('creates whole-unit default room and returns quick-entry payload', async () => {
    const store = createMockStore();
    const result = await quickEntryMain({
      mode: 'quick-entry',
      asset: {
        name: '金地公寓 301',
        rentalMode: 'whole',
        address: '松江区',
        note: ''
      },
      tenant: {
        name: '刘租客',
        phone: '13800000000',
        note: ''
      },
      lease: {
        startDate: '2026-04-01',
        endDate: '2026-06-30',
        billingCycleDays: 30,
        rentAmount: 3200,
        depositAmount: 3200,
        note: ''
      },
      __mockDb: createMockDb(store),
      __mockContext: {
        getWXContext: () => getWXContext('openid-qe')
      },
      now: '2026-04-01T00:00:00.000Z'
    });

    expect(result.mode).toBe('quick-entry');
    expect(result.rooms[0].isWholeUnitDefault).toBe(true);
    expect(store.assets[0]).toMatchObject({ rentalMode: 'whole' });
    expect(store.leases[0]).toMatchObject({ roomId: result.rooms[0].id });
  });
});
