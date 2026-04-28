import { main as receiptCreateMain } from '../../cloudfunctions/receipt-create/index';
import { createMockDb, createMockStore, getWXContext } from '../helpers/mock-cloud';

function seedReceiptData(store: ReturnType<typeof createMockStore>) {
  store.assets.push({ id: 'asset_1', landlordOpenId: 'openid', name: '152号楼', rentalMode: 'split', createdAt: '', updatedAt: '' });
  store.rooms.push({ id: 'room_101', landlordOpenId: 'openid', assetId: 'asset_1', name: '101', isWholeUnitDefault: false, createdAt: '', updatedAt: '' });
  store.tenants.push({ id: 'tenant_1', landlordOpenId: 'openid', name: '张三', createdAt: '', updatedAt: '' });
  store.leases.push({
    id: 'lease_1',
    landlordOpenId: 'openid',
    roomId: 'room_101',
    tenantId: 'tenant_1',
    startDate: '2026-04-01',
    endDate: '2026-12-31',
    billingCycleDays: 30,
    rentAmount: 2600,
    depositAmount: 2600,
    closedAt: null,
    createdAt: '',
    updatedAt: ''
  });
  store.bills.push(
    {
      id: 'bill_paid',
      landlordOpenId: 'openid',
      leaseId: 'lease_1',
      roomId: 'room_101',
      type: 'rent',
      section: 'rent',
      dueDate: '2026-04-01',
      amount: 2600,
      status: 'paid',
      receivedAt: '2026-04-05T00:00:00.000Z',
      receivedAmount: 2600,
      source: 'system',
      feeNature: 'recurring',
      responsibility: 'tenant',
      cadence: 'cycle',
      isDepositLike: false,
      isOneTime: false,
      createdAt: '',
      updatedAt: ''
    },
    {
      id: 'bill_unpaid',
      landlordOpenId: 'openid',
      leaseId: 'lease_1',
      roomId: 'room_101',
      type: 'water',
      section: 'non_rent',
      dueDate: '2026-04-01',
      amount: 45,
      status: 'pending',
      receivedAt: null,
      receivedAmount: null,
      source: 'manual',
      feeNature: 'one_time',
      responsibility: 'tenant',
      cadence: 'once',
      isDepositLike: false,
      isOneTime: true,
      createdAt: '',
      updatedAt: ''
    }
  );
}

function callCreate(store: ReturnType<typeof createMockStore>, data: Record<string, unknown>) {
  return receiptCreateMain({
    __mockDb: createMockDb(store),
    __mockContext: {
      getWXContext: () => getWXContext('openid')
    },
    now: '2026-04-28T10:00:00.000Z',
    ...data
  } as any);
}

describe('receipt-create cloud function', () => {
  it('creates snapshot only from paid tenant bills', async () => {
    const store = createMockStore();
    seedReceiptData(store);

    const receipt = await callCreate(store, { billIds: ['bill_paid'], collectorName: '房东' });

    expect(receipt.title).toBe('收款收据（非发票）');
    expect(receipt.tenantName).toBe('张三');
    expect(receipt.items).toHaveLength(1);
    expect(receipt.totalAmount).toBe(2600);
  });

  it('rejects unpaid bills and owner expenses', async () => {
    const store = createMockStore();
    seedReceiptData(store);

    await expect(callCreate(store, { billIds: ['bill_unpaid'] })).rejects.toThrow('paid tenant bills');
    await expect(callCreate(store, { billIds: [] })).rejects.toThrow('Pass billIds or month + roomId');
  });

  it('links created receipt back to bills', async () => {
    const store = createMockStore();
    seedReceiptData(store);

    const receipt = await callCreate(store, { billIds: ['bill_paid'] });

    expect(store.bills.find((bill) => bill.id === 'bill_paid')?.receiptId).toBe(receipt.id);
    expect(store.bills.find((bill) => bill.id === 'bill_paid')?.receiptNo).toBe(receipt.receiptNo);
  });

  it('does not mutate receipt snapshot when bill changes', async () => {
    const store = createMockStore();
    seedReceiptData(store);

    const receipt = await callCreate(store, { billIds: ['bill_paid'] });
    const bill = store.bills.find((item) => item.id === 'bill_paid');
    if (bill) {
      bill.amount = 9999;
      bill.receivedAmount = 9999;
    }

    expect(store.receipts.find((item) => item.id === receipt.id)?.totalAmount).toBe(2600);
    expect(store.receipts.find((item) => item.id === receipt.id)?.items).toEqual(receipt.items);
  });
});
