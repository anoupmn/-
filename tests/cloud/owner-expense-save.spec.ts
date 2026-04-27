import { main as ownerExpenseSaveMain } from '../../cloudfunctions/owner-expense-save/index';
import { createMockDb, createMockStore, getWXContext } from '../helpers/mock-cloud';

function seedRoom(store: ReturnType<typeof createMockStore>) {
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
  store.leases.push({
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
  });
}

describe('owner-expense-save cloud function', () => {
  it('creates owner expense with optional amount', async () => {
    const store = createMockStore();
    seedRoom(store);

    const result = await ownerExpenseSaveMain({
      roomId: 'room_1',
      expenseType: 'cleaning',
      note: '退租后保洁',
      occurredAt: '2026-04-12',
      __mockDb: createMockDb(store),
      __mockContext: {
        getWXContext: () => getWXContext('openid')
      },
      now: '2026-04-12T00:00:00.000Z'
    });

    expect(result.collectionName).toBe('owner_expenses');
    expect(result.expense.amount).toBeNull();
    expect(result.expense.monthKey).toBe('2026-04');
    expect(store.ownerExpenses).toHaveLength(1);
    expect(store.bills).toHaveLength(0);
  });

  it('links repair expense to repair record', async () => {
    const store = createMockStore();
    seedRoom(store);

    const result = await ownerExpenseSaveMain({
      roomId: 'room_1',
      expenseType: 'repair',
      repairCategory: 'plumbing',
      amount: 180,
      note: '厨房水龙头漏水',
      occurredAt: '2026-04-15',
      __mockDb: createMockDb(store),
      __mockContext: {
        getWXContext: () => getWXContext('openid')
      },
      now: '2026-04-15T00:00:00.000Z'
    });

    expect(store.ownerExpenses).toHaveLength(1);
    expect(store.repairRecords).toHaveLength(1);
    expect(result.expense.repairRecordId).toBe(store.repairRecords[0]?.id);
    expect(store.repairRecords[0]?.leaseId).toBe('lease_1');
    expect(store.repairRecords[0]?.category).toBe('plumbing');
  });

  it('does not create repair record for cleaning caretaking labor or other', async () => {
    const store = createMockStore();
    seedRoom(store);
    const db = createMockDb(store);
    const __mockContext = {
      getWXContext: () => getWXContext('openid')
    };

    for (const expenseType of ['cleaning', 'caretaking', 'labor', 'other'] as const) {
      await ownerExpenseSaveMain({
        roomId: 'room_1',
        expenseType,
        amount: 50,
        note: `${expenseType} note`,
        occurredAt: '2026-04-16',
        __mockDb: db,
        __mockContext,
        now: '2026-04-16T00:00:00.000Z'
      });
    }

    expect(store.ownerExpenses).toHaveLength(4);
    expect(store.repairRecords).toHaveLength(0);
    expect(store.bills).toHaveLength(0);
  });

  it('groups expenses by occurredAt month for export contract', async () => {
    const store = createMockStore();
    seedRoom(store);
    const db = createMockDb(store);
    const __mockContext = {
      getWXContext: () => getWXContext('openid')
    };

    await ownerExpenseSaveMain({
      roomId: 'room_1',
      expenseType: 'cleaning',
      amount: 80,
      note: '四月保洁',
      occurredAt: '2026-04-30',
      __mockDb: db,
      __mockContext,
      now: '2026-04-30T00:00:00.000Z'
    });
    await ownerExpenseSaveMain({
      roomId: 'room_1',
      expenseType: 'labor',
      amount: 120,
      note: '五月请人管理',
      occurredAt: '2026-05-01',
      __mockDb: db,
      __mockContext,
      now: '2026-05-01T00:00:00.000Z'
    });

    expect(store.ownerExpenses.map((item) => item.monthKey)).toEqual(['2026-04', '2026-05']);
  });
});
