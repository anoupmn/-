import { main as billsSaveMain } from '../../cloudfunctions/bills-save/index';
import { createMockDb, createMockStore, getWXContext } from '../helpers/mock-cloud';

describe('bills-save cloud function', () => {
  function seedLease(store: ReturnType<typeof createMockStore>) {
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

  it('creates manual bill for active landlord lease', async () => {
    const store = createMockStore();
    seedLease(store);

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

  it('calculates utility amount from meter readings on server', async () => {
    const store = createMockStore();
    seedLease(store);

    const result = await billsSaveMain({
      leaseId: 'lease_1',
      monthKey: '2026-04',
      type: 'water',
      previousReading: 100,
      currentReading: 135.5,
      unitPrice: 3.2,
      __mockDb: createMockDb(store),
      __mockContext: {
        getWXContext: () => getWXContext('openid')
      },
      now: '2026-04-10T00:00:00.000Z'
    });

    if ('deletedBillId' in result) {
      throw new Error('expected create mode response');
    }

    expect(result.type).toBe('water');
    expect(result.meterReading).toEqual({
      previousReading: 100,
      currentReading: 135.5,
      usage: 35.5,
      unitPrice: 3.2
    });
    expect(result.amount).toBe(113.6);
    expect(store.bills[0]?.amount).toBe(113.6);
  });

  it('rejects utility bill when current reading is lower than previous reading', async () => {
    const store = createMockStore();
    seedLease(store);

    await expect(
      billsSaveMain({
        leaseId: 'lease_1',
        monthKey: '2026-04',
        type: 'electricity',
        previousReading: 80,
        currentReading: 79,
        unitPrice: 0.8,
        __mockDb: createMockDb(store),
        __mockContext: {
          getWXContext: () => getWXContext('openid')
        },
        now: '2026-04-10T00:00:00.000Z'
      })
    ).rejects.toThrow('currentReading must be greater than or equal to previousReading.');

    expect(store.bills).toHaveLength(0);
  });

  it('keeps utility note and does not trust client amount', async () => {
    const store = createMockStore();
    seedLease(store);

    const result = await billsSaveMain({
      leaseId: 'lease_1',
      monthKey: '2026-04',
      type: 'electricity',
      amount: 1,
      previousReading: 200,
      currentReading: 260,
      unitPrice: 0.75,
      note: '含阶梯电价调整',
      __mockDb: createMockDb(store),
      __mockContext: {
        getWXContext: () => getWXContext('openid')
      },
      now: '2026-04-10T00:00:00.000Z'
    });

    if ('deletedBillId' in result) {
      throw new Error('expected create mode response');
    }

    expect(result.amount).toBe(45);
    expect(result.note).toBe('含阶梯电价调整');
  });

  it('rejects landlord expense labels in tenant bills', async () => {
    const store = createMockStore();
    seedLease(store);

    await expect(
      billsSaveMain({
        leaseId: 'lease_1',
        monthKey: '2026-04',
        type: 'custom',
        amount: 120,
        itemLabel: '维修费-门锁',
        __mockDb: createMockDb(store),
        __mockContext: {
          getWXContext: () => getWXContext('openid')
        },
        now: '2026-04-10T00:00:00.000Z'
      })
    ).rejects.toThrow('Landlord expenses must not be recorded as tenant bills.');
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
