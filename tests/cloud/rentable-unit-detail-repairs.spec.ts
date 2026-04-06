import { main as rentableUnitDetailMain } from '../../cloudfunctions/rentable-unit-detail/index';
import { createMockDb, createMockStore } from '../helpers/mock-cloud';

describe('rentable-unit-detail repairs archive', () => {
  it('returns repair stats, major categories, tenant-period counts and repair history', async () => {
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
        name: '李租客',
        phone: '',
        note: '',
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'tenant_2',
        landlordOpenId: 'openid',
        name: '王租客',
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
        endDate: '2026-03-31',
        billingCycleDays: 30,
        rentAmount: 2600,
        depositAmount: 2600,
        note: '',
        closedAt: '2026-03-31T00:00:00.000Z',
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'lease_2',
        landlordOpenId: 'openid',
        roomId: 'room_1',
        tenantId: 'tenant_2',
        startDate: '2026-04-01',
        endDate: '2026-06-30',
        billingCycleDays: 30,
        rentAmount: 2800,
        depositAmount: 2800,
        note: '',
        closedAt: null,
        createdAt: '',
        updatedAt: ''
      }
    );
    store.repairRecords.push(
      {
        id: 'repair_1',
        landlordOpenId: 'openid',
        assetId: 'asset_1',
        roomId: 'room_1',
        leaseId: 'lease_1',
        tenantId: 'tenant_1',
        category: 'plumbing',
        note: '厨房水槽堵塞',
        occurredAt: '2026-03-15',
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'repair_2',
        landlordOpenId: 'openid',
        assetId: 'asset_1',
        roomId: 'room_1',
        leaseId: 'lease_2',
        tenantId: 'tenant_2',
        category: 'electrical',
        note: '卧室插座短路',
        occurredAt: '2026-03-20',
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'repair_3',
        landlordOpenId: 'openid',
        assetId: 'asset_1',
        roomId: 'room_1',
        leaseId: 'lease_2',
        tenantId: 'tenant_2',
        category: 'plumbing',
        note: '卫生间漏水',
        occurredAt: '2026-03-28',
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'repair_4',
        landlordOpenId: 'openid',
        assetId: 'asset_1',
        roomId: 'room_1',
        leaseId: 'lease_2',
        tenantId: 'tenant_2',
        category: 'plumbing',
        note: '阳台地漏返味',
        occurredAt: '2026-04-06',
        createdAt: '',
        updatedAt: ''
      }
    );

    const result = await rentableUnitDetailMain({
      roomId: 'room_1',
      __mockDb: createMockDb(store),
      now: '2026-04-10T00:00:00.000Z'
    });

    expect(result.repairStats.totalCount).toBe(4);
    expect(result.repairStats.recent30dCount).toBe(4);
    expect(result.repairStats.topCategories[0]?.label).toBe('水路');
    expect(result.repairStats.topCategories[0]?.count).toBe(3);
    expect(result.repairStats.abnormal.active).toBe(true);
    expect(result.repairStats.abnormal.reason).toContain('近 30 天维修 4 次');

    expect(result.tenantPeriodRepairs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          leaseId: 'lease_1',
          tenantName: '李租客',
          count: 3
        }),
        expect.objectContaining({
          leaseId: 'lease_2',
          tenantName: '王租客',
          count: 1
        })
      ])
    );

    expect(result.leaseHistory[0]?.tenantName).toBe('李租客');
    expect(result.repairHistory[0]?.categoryLabel).toBe('水路');
    expect(result.repairHistory[0]?.note).toContain('阳台地漏返味');
  });
});
