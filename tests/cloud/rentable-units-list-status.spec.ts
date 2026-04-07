import { main as rentableUnitsListMain } from '../../cloudfunctions/rentable-units-list/index';
import { BILL_STATUSES } from '../../cloudfunctions/shared/constants/statuses';
import { createMockDb, createMockStore } from '../helpers/mock-cloud';

describe('rentable-units-list status view', () => {
  it('returns main status, riskTagLabels, and summaryHint for 15-day due bills and abnormal overdue rooms', async () => {
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
    store.rooms.push(
      {
        id: 'room_1',
        landlordOpenId: 'openid',
        assetId: 'asset_1',
        name: 'A1',
        note: '',
        isWholeUnitDefault: false,
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'room_2',
        landlordOpenId: 'openid',
        assetId: 'asset_1',
        name: 'A2',
        note: '',
        isWholeUnitDefault: false,
        createdAt: '',
        updatedAt: ''
      }
    );
    store.tenants.push(
      {
        id: 'tenant_1',
        landlordOpenId: 'openid',
        name: '张三',
        phone: '',
        note: '',
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'tenant_2',
        landlordOpenId: 'openid',
        name: '李四',
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
        startDate: '2026-04-01',
        endDate: '2026-06-30',
        billingCycleDays: 30,
        rentAmount: 2600,
        depositAmount: 2600,
        note: '',
        closedAt: null,
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'lease_2',
        landlordOpenId: 'openid',
        roomId: 'room_2',
        tenantId: 'tenant_2',
        startDate: '2026-04-01',
        endDate: '2026-06-30',
        billingCycleDays: 30,
        rentAmount: 3000,
        depositAmount: 3000,
        note: '',
        closedAt: null,
        createdAt: '',
        updatedAt: ''
      }
    );
    store.bills.push(
      {
        id: 'bill_due_soon',
        landlordOpenId: 'openid',
        leaseId: 'lease_1',
        roomId: 'room_1',
        type: 'rent',
        section: 'rent',
        dueDate: '2026-04-10',
        amount: 2600,
        status: BILL_STATUSES.pending,
        receivedAt: null,
        receivedAmount: null,
        note: '',
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'bill_overdue',
        landlordOpenId: 'openid',
        leaseId: 'lease_2',
        roomId: 'room_2',
        type: 'rent',
        section: 'rent',
        dueDate: '2026-03-20',
        amount: 3000,
        status: BILL_STATUSES.pending,
        receivedAt: null,
        receivedAmount: null,
        note: '',
        createdAt: '',
        updatedAt: ''
      }
    );

    const result = await rentableUnitsListMain({
      __mockDb: createMockDb(store),
      __mockContext: { getWXContext: () => ({ OPENID: 'openid' }) },
      now: '2026-04-01T00:00:00.000Z'
    });

    const dueSoonRoom = result.find((item) => item.roomId === 'room_1');
    const overdueRoom = result.find((item) => item.roomId === 'room_2');

    expect(dueSoonRoom?.mainStatus).toBe('occupied');
    expect(dueSoonRoom?.riskTagLabels.join(' ')).toContain('即将到期');
    expect(dueSoonRoom?.summaryHint).toContain('15');
    expect(overdueRoom?.riskTagLabels.join(' ')).toContain('异常');
    expect(overdueRoom?.summaryHint).toContain('已逾期');
  });
});
