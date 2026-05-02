import { main as roomsDeleteMain } from '../../cloudfunctions/rooms-delete/index';
import { createMockDb, createMockStore, getWXContext } from '../helpers/mock-cloud';

function seedRoom(store: ReturnType<typeof createMockStore>, changes: Record<string, unknown> = {}) {
  store.rooms.push({
    id: 'room_1',
    landlordOpenId: 'openid',
    assetId: 'asset_1',
    name: '101',
    note: '',
    isWholeUnitDefault: false,
    createdAt: '',
    updatedAt: '',
    ...changes
  });
}

function callDelete(store: ReturnType<typeof createMockStore>, event: Record<string, unknown> = {}) {
  return roomsDeleteMain({
    roomId: 'room_1',
    __mockDb: createMockDb(store),
    __mockContext: {
      getWXContext: () => getWXContext('openid')
    },
    ...event
  } as any);
}

describe('rooms-delete cloud function', () => {
  it('deletes an unreferenced non-default room with explicit confirm', async () => {
    const store = createMockStore();
    seedRoom(store);

    const result = await callDelete(store, { mode: 'delete', confirm: true });

    expect(result).toMatchObject({
      canDelete: true,
      deleted: true
    });
    expect(store.rooms).toHaveLength(0);
  });

  it('requires explicit confirm before deleting a room', async () => {
    const store = createMockStore();
    seedRoom(store);

    const result = await callDelete(store, { mode: 'check' });

    expect(result).toMatchObject({
      canDelete: true,
      deleted: false
    });
    expect(store.rooms).toHaveLength(1);
  });

  it('blocks deleting the whole-unit default room', async () => {
    const store = createMockStore();
    seedRoom(store, { isWholeUnitDefault: true });

    const result = await callDelete(store, { mode: 'delete', confirm: true });

    expect(result.canDelete).toBe(false);
    expect(result.blockers.map((item: { code: string }) => item.code)).toEqual(['whole_unit_default']);
    expect(store.rooms).toHaveLength(1);
  });

  it('blocks deleting a room with business references', async () => {
    const store = createMockStore();
    seedRoom(store);
    store.leases.push({
      id: 'lease_1',
      landlordOpenId: 'openid',
      roomId: 'room_1'
    });
    store.bills.push({
      id: 'bill_1',
      landlordOpenId: 'openid',
      roomId: 'room_1'
    });
    store.receipts.push({
      id: 'receipt_1',
      landlordOpenId: 'openid',
      roomId: 'room_1'
    });
    store.repairRecords.push({
      id: 'repair_1',
      landlordOpenId: 'openid',
      roomId: 'room_1'
    });
    store.ownerExpenses.push({
      id: 'expense_1',
      landlordOpenId: 'openid',
      roomId: 'room_1'
    });

    const result = await callDelete(store, { mode: 'delete', confirm: true });

    expect(result.canDelete).toBe(false);
    expect(result.blockers.map((item: { code: string }) => item.code)).toEqual([
      'lease',
      'bill',
      'receipt',
      'repair_record',
      'owner_expense'
    ]);
    expect(store.rooms).toHaveLength(1);
  });

  it('does not let one landlord delete another landlord room', async () => {
    const store = createMockStore();
    seedRoom(store, { landlordOpenId: 'another-openid' });

    await expect(callDelete(store, { mode: 'delete', confirm: true })).rejects.toThrow('Room room_1 not found.');
    expect(store.rooms).toHaveLength(1);
  });
});
