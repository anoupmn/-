import { main as billsSaveMain } from '../../cloudfunctions/bills-save/index';
import { createMockDb, createMockStore, getWXContext } from '../helpers/mock-cloud';

describe('bills-save cloud function', () => {
  it('creates manual bill for active landlord lease', async () => {
    const store = createMockStore();
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

    const result = await billsSaveMain({
      leaseId: 'lease_1',
      monthKey: '2026-04',
      type: 'custom',
      amount: 88,
      itemLabel: '空调清洗费',
      __mockDb: createMockDb(store),
      __mockContext: {
        getWXContext: () => getWXContext('openid')
      },
      now: '2026-04-10T00:00:00.000Z'
    });

    if ('deletedBillId' in result) {
      throw new Error('expected create mode response');
    }

    expect(result.source).toBe('manual');
    expect(result.itemLabel).toBe('空调清洗费');
    expect(store.bills).toHaveLength(1);
  });

  it('deletes manual bill and keeps system bill protected', async () => {
    const store = createMockStore();
    store.bills.push(
      {
        id: 'bill_manual_1',
        landlordOpenId: 'openid',
        leaseId: 'lease_1',
        roomId: 'room_1',
        type: 'custom',
        section: 'non_rent',
        dueDate: '2026-04-01',
        amount: 100,
        status: 'pending',
        receivedAt: null,
        receivedAmount: null,
        note: '',
        source: 'manual',
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'bill_system_1',
        landlordOpenId: 'openid',
        leaseId: 'lease_1',
        roomId: 'room_1',
        type: 'rent',
        section: 'rent',
        dueDate: '2026-04-01',
        amount: 2600,
        status: 'pending',
        receivedAt: null,
        receivedAmount: null,
        note: '',
        source: 'system',
        createdAt: '',
        updatedAt: ''
      }
    );
    const __mockDb = createMockDb(store);
    const __mockContext = {
      getWXContext: () => getWXContext('openid')
    };

    const deleteResult = await billsSaveMain({
      mode: 'delete',
      billId: 'bill_manual_1',
      __mockDb,
      __mockContext
    } as any);

    expect(deleteResult).toEqual({
      deletedBillId: 'bill_manual_1'
    });
    expect(store.bills.some((item) => item.id === 'bill_manual_1')).toBe(false);

    await expect(
      billsSaveMain({
        mode: 'delete',
        billId: 'bill_system_1',
        __mockDb,
        __mockContext
      } as any)
    ).rejects.toThrow('Only manual bills can be deleted.');
  });
});
