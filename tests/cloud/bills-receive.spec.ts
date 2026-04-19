import { main as billsReceiveMain } from '../../cloudfunctions/bills-receive/index';
import { BILL_STATUSES } from '../../cloudfunctions/shared/constants/statuses';
import { createMockDb, createMockStore, getWXContext } from '../helpers/mock-cloud';

describe('bills-receive cloud function', () => {
  it('marks a bill as paid when receiveBill payload is submitted', async () => {
    const store = createMockStore();
    store.bills.push({
      id: 'bill_1',
      landlordOpenId: 'openid',
      leaseId: 'lease_1',
      roomId: 'room_1',
      type: 'rent',
      section: 'rent',
      dueDate: '2026-04-01',
      amount: 2800,
      status: BILL_STATUSES.pending,
      receivedAt: null,
      receivedAmount: null,
      note: '',
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-04-01T00:00:00.000Z'
    });

    const result = await billsReceiveMain({
      billId: 'bill_1',
      receivedAt: '2026-04-03T09:00:00.000Z',
      receivedAmount: 2800,
      __mockDb: createMockDb(store),
      __mockContext: {
        getWXContext: () => getWXContext('openid')
      },
      now: '2026-04-03T09:00:00.000Z'
    });

    expect(result.status).toBe(BILL_STATUSES.paid);
    expect(result.receivedAt).toBe('2026-04-03T09:00:00.000Z');
    expect(result.receivedAmount).toBe(2800);
  });

  it('rejects receiving bill from another landlord', async () => {
    const store = createMockStore();
    store.bills.push({
      id: 'bill_1',
      landlordOpenId: 'openid_a',
      leaseId: 'lease_1',
      roomId: 'room_1',
      type: 'rent',
      section: 'rent',
      dueDate: '2026-04-01',
      amount: 2800,
      status: BILL_STATUSES.pending,
      receivedAt: null,
      receivedAmount: null,
      note: '',
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-04-01T00:00:00.000Z'
    });

    await expect(
      billsReceiveMain({
        billId: 'bill_1',
        receivedAt: '2026-04-03T09:00:00.000Z',
        receivedAmount: 2800,
        __mockDb: createMockDb(store),
        __mockContext: {
          getWXContext: () => getWXContext('openid_b')
        },
        now: '2026-04-03T09:00:00.000Z'
      })
    ).rejects.toThrow('Bill bill_1 not found.');
  });

  it('finds bill by precise query even when collection get is paginated', async () => {
    const store = createMockStore();
    store.bills.push(
      {
        id: 'bill_page_1',
        landlordOpenId: 'openid',
        leaseId: 'lease_1',
        roomId: 'room_1',
        type: 'rent',
        section: 'rent',
        dueDate: '2026-04-01',
        amount: 2000,
        status: BILL_STATUSES.pending,
        receivedAt: null,
        receivedAmount: null,
        note: '',
        createdAt: '2026-04-01T00:00:00.000Z',
        updatedAt: '2026-04-01T00:00:00.000Z'
      },
      {
        id: 'bill_target',
        landlordOpenId: 'openid',
        leaseId: 'lease_2',
        roomId: 'room_2',
        type: 'rent',
        section: 'rent',
        dueDate: '2026-04-01',
        amount: 3000,
        status: BILL_STATUSES.pending,
        receivedAt: null,
        receivedAmount: null,
        note: '',
        createdAt: '2026-04-01T00:00:00.000Z',
        updatedAt: '2026-04-01T00:00:00.000Z'
      }
    );

    const rawDb = createMockDb(store);
    const db = {
      ...rawDb,
      collection(name: string) {
        const base = rawDb.collection(name as never);
        if (name !== 'bills') {
          return base;
        }

        return {
          ...base,
          async get() {
            return {
              data: [store.bills[0]]
            };
          }
        };
      }
    };

    const result = await billsReceiveMain({
      billId: 'bill_target',
      receivedAt: '2026-04-06T09:00:00.000Z',
      receivedAmount: 3000,
      __mockDb: db as never,
      __mockContext: {
        getWXContext: () => getWXContext('openid')
      },
      now: '2026-04-06T09:00:00.000Z'
    });

    expect(result.id).toBe('bill_target');
    expect(result.status).toBe(BILL_STATUSES.paid);
    expect(result.receivedAmount).toBe(3000);
  });
});
