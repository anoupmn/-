import { main as leasesDeleteMain } from '../../cloudfunctions/leases-delete/index';
import { createMockDb, createMockStore, getWXContext } from '../helpers/mock-cloud';

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

function callDelete(store: ReturnType<typeof createMockStore>, event: Record<string, unknown> = {}) {
  return leasesDeleteMain({
    leaseId: 'lease_1',
    __mockDb: createMockDb(store),
    __mockContext: {
      getWXContext: () => getWXContext('openid')
    },
    ...event
  } as any);
}

describe('leases-delete cloud function', () => {
  it('deletes lease and unpaid bills when there are no blockers', async () => {
    const store = createMockStore();
    seedLease(store);
    store.bills.push(
      {
        id: 'bill_unpaid_1',
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
        source: 'system',
        createdAt: '',
        updatedAt: ''
      },
      {
        id: 'bill_other_lease',
        landlordOpenId: 'openid',
        leaseId: 'lease_other',
        roomId: 'room_1',
        type: 'rent',
        section: 'rent',
        dueDate: '2026-04-01',
        amount: 2600,
        status: 'pending',
        receivedAt: null,
        receivedAmount: null,
        source: 'system',
        createdAt: '',
        updatedAt: ''
      }
    );

    const result = await callDelete(store, { mode: 'delete', confirm: true });

    expect(result).toMatchObject({
      canDelete: true,
      deleted: true,
      deletedBillCount: 1,
      unpaidBillCount: 1
    });
    expect(store.leases).toHaveLength(0);
    expect(store.bills.map((bill) => bill.id)).toEqual(['bill_other_lease']);
  });

  it('blocks hard delete when lease has paid bill', async () => {
    const store = createMockStore();
    seedLease(store);
    store.bills.push({
      id: 'bill_paid',
      landlordOpenId: 'openid',
      leaseId: 'lease_1',
      roomId: 'room_1',
      type: 'rent',
      section: 'rent',
      dueDate: '2026-04-01',
      amount: 2600,
      status: 'paid',
      receivedAt: '2026-04-03T00:00:00.000Z',
      receivedAmount: 2600,
      source: 'system',
      createdAt: '',
      updatedAt: ''
    });

    const result = await callDelete(store, { mode: 'delete', confirm: true });

    expect(result.canDelete).toBe(false);
    expect(result.blockers.map((item) => item.code)).toEqual(['paid_bill']);
    expect(store.leases).toHaveLength(1);
  });

  it('blocks hard delete when lease has receipt reference', async () => {
    const store = createMockStore();
    seedLease(store);
    store.bills.push({
      id: 'bill_receipt',
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
      source: 'system',
      receiptId: 'receipt_1',
      createdAt: '',
      updatedAt: ''
    });
    store.receipts.push({
      id: 'receipt_1',
      landlordOpenId: 'openid',
      leaseId: 'lease_1',
      billIds: ['bill_receipt']
    });

    const result = await callDelete(store, { mode: 'delete', confirm: true });

    expect(result.canDelete).toBe(false);
    expect(result.blockers.map((item) => item.code)).toEqual(['receipt']);
    expect(store.leases).toHaveLength(1);
  });

  it('blocks hard delete when lease has repair record', async () => {
    const store = createMockStore();
    seedLease(store);
    store.repairRecords.push({
      id: 'repair_1',
      landlordOpenId: 'openid',
      leaseId: 'lease_1',
      roomId: 'room_1',
      assetId: 'asset_1',
      tenantId: 'tenant_1'
    });

    const result = await callDelete(store, { mode: 'delete', confirm: true });

    expect(result.canDelete).toBe(false);
    expect(result.blockers.map((item) => item.code)).toEqual(['repair_record']);
    expect(store.leases).toHaveLength(1);
  });

  it('blocks hard delete when lease has owner expense', async () => {
    const store = createMockStore();
    seedLease(store);
    store.ownerExpenses.push({
      id: 'expense_1',
      landlordOpenId: 'openid',
      leaseId: 'lease_1',
      roomId: 'room_1',
      assetId: 'asset_1',
      expenseType: 'cleaning'
    });

    const result = await callDelete(store, { mode: 'delete', confirm: true });

    expect(result.canDelete).toBe(false);
    expect(result.blockers.map((item) => item.code)).toEqual(['owner_expense']);
    expect(store.leases).toHaveLength(1);
  });

  it('requires explicit confirm before destructive delete', async () => {
    const store = createMockStore();
    seedLease(store);
    store.bills.push({
      id: 'bill_unpaid_1',
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
      source: 'system',
      createdAt: '',
      updatedAt: ''
    });

    const result = await callDelete(store, { mode: 'check' });

    expect(result).toMatchObject({
      canDelete: true,
      deleted: false,
      unpaidBillCount: 1
    });
    expect(store.leases).toHaveLength(1);
    expect(store.bills).toHaveLength(1);
  });
});
