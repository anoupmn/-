import { main as repairRecordSaveMain } from '../../cloudfunctions/repair-record-save/index';
import { createMockDb, createMockStore } from '../helpers/mock-cloud';

describe('repair-record-save cloud function', () => {
  it('creates room repair record and auto-links lease period', async () => {
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
    store.rooms.push({
      id: 'room_1',
      landlordOpenId: 'openid',
      assetId: 'asset_1',
      name: 'A101',
      note: '',
      isWholeUnitDefault: false,
      createdAt: '',
      updatedAt: ''
    });
    store.leases.push({
      id: 'lease_1',
      landlordOpenId: 'openid',
      roomId: 'room_1',
      tenantId: 'tenant_1',
      startDate: '2026-03-01',
      endDate: '2026-08-31',
      billingCycleDays: 30,
      rentAmount: 2800,
      depositAmount: 2800,
      note: '',
      closedAt: null,
      createdAt: '',
      updatedAt: ''
    });

    const result = await repairRecordSaveMain({
      roomId: 'room_1',
      category: 'plumbing',
      note: '厨房水管渗漏',
      occurredAt: '2026-04-06',
      __mockDb: createMockDb(store),
      __mockContext: { getWXContext: () => ({ OPENID: 'openid' }) }
    });

    expect(result.collectionName).toBe('repair_records');
    expect(result.record.assetId).toBe('asset_1');
    expect(result.record.roomId).toBe('room_1');
    expect(result.record.leaseId).toBe('lease_1');
    expect(result.record.tenantId).toBe('tenant_1');
    expect(result.record.occurredAt).toBe('2026-04-06');
    expect(store.repairRecords).toHaveLength(1);
  });

  it('supports asset-level repair record without room linkage', async () => {
    const store = createMockStore();
    store.assets.push({
      id: 'asset_2',
      landlordOpenId: 'openid',
      name: '整租房源',
      rentalMode: 'whole',
      address: '',
      note: '',
      createdAt: '',
      updatedAt: ''
    });

    const result = await repairRecordSaveMain({
      assetId: 'asset_2',
      category: 'safety',
      note: '更换烟雾报警器',
      occurredAt: '2026-04-06',
      __mockDb: createMockDb(store),
      __mockContext: { getWXContext: () => ({ OPENID: 'openid' }) }
    });

    expect(result.record.assetId).toBe('asset_2');
    expect(result.record.roomId).toBeNull();
    expect(result.record.leaseId).toBeNull();
    expect(result.record.tenantId).toBeNull();
  });

  it('rejects empty note', async () => {
    const store = createMockStore();
    store.assets.push({
      id: 'asset_3',
      landlordOpenId: 'openid',
      name: '测试房源',
      rentalMode: 'whole',
      address: '',
      note: '',
      createdAt: '',
      updatedAt: ''
    });

    await expect(
      repairRecordSaveMain({
        assetId: 'asset_3',
        category: 'other',
        note: '   ',
        occurredAt: '2026-04-06',
        __mockDb: createMockDb(store),
        __mockContext: { getWXContext: () => ({ OPENID: 'openid' }) }
      })
    ).rejects.toBeTruthy();
  });
});
