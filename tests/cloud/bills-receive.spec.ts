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
});
