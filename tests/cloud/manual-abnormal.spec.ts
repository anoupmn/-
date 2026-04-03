import { main as saveManualAbnormalMain } from '../../cloudfunctions/alert-manual-flag-save/index';
import { COLLECTIONS } from '../../cloudfunctions/shared/constants/collections';
import { createMockCloudContext, createMockDb, createMockStore } from '../helpers/mock-cloud';

describe('alert-manual-flag-save cloud function', () => {
  it('saves a manual abnormal reason without mutating room truth fields', async () => {
    const store = createMockStore();
    store.rooms.push({
      id: 'room_1',
      landlordOpenId: 'openid',
      assetId: 'asset_1',
      name: 'A101',
      note: '原始备注',
      isWholeUnitDefault: false,
      createdAt: '',
      updatedAt: ''
    });

    const result = await saveManualAbnormalMain({
      roomId: 'room_1',
      reason: '窗户渗水',
      active: true,
      __mockDb: createMockDb(store),
      __mockContext: createMockCloudContext('openid'),
      now: '2026-04-01T00:00:00.000Z'
    });

    expect(result.flag.reason).toBe('窗户渗水');
    expect(store.rooms[0]?.note).toBe('原始备注');
    expect(store.abnormalFlags?.[0]?.roomId).toBe('room_1');
    expect(result.collectionName).toBe(COLLECTIONS.abnormalFlags);
  });

  it('supports clear by marking the manual abnormal inactive', async () => {
    const store = createMockStore();
    store.abnormalFlags = [
      {
        id: 'flag_1',
        landlordOpenId: 'openid',
        roomId: 'room_1',
        reason: '空调异响',
        active: true,
        createdAt: '2026-04-01T00:00:00.000Z',
        updatedAt: '2026-04-01T00:00:00.000Z',
        clearedAt: null
      }
    ];

    const result = await saveManualAbnormalMain({
      roomId: 'room_1',
      reason: '',
      active: false,
      __mockDb: createMockDb(store),
      __mockContext: createMockCloudContext('openid'),
      now: '2026-04-03T00:00:00.000Z'
    });

    expect(result.flag.active).toBe(false);
    expect(result.flag.clearedAt).toBe('2026-04-03T00:00:00.000Z');
    expect(store.abnormalFlags[0]?.reason).toBe('空调异响');
  });
});
