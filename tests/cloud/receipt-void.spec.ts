import { main as receiptCreateMain } from '../../cloudfunctions/receipt-create/index';
import { main as receiptVoidMain } from '../../cloudfunctions/receipt-void/index';
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
  store.bills.push({
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
  });
}

function context(store: ReturnType<typeof createMockStore>, now: string) {
  return {
    __mockDb: createMockDb(store),
    __mockContext: {
      getWXContext: () => getWXContext('openid')
    },
    now
  };
}

describe('receipt-void cloud function', () => {
  it('voids receipt without deleting snapshot', async () => {
    const store = createMockStore();
    seedReceiptData(store);
    const receipt = await receiptCreateMain({ ...context(store, '2026-04-28T10:00:00.000Z'), billIds: ['bill_paid'] } as any);

    const voided = await receiptVoidMain({
      ...context(store, '2026-04-28T11:00:00.000Z'),
      receiptId: receipt.id,
      voidReason: '金额录错'
    } as any);

    expect(voided.status).toBe('voided');
    expect(voided.voidReason).toBe('金额录错');
    expect(voided.items).toEqual(receipt.items);
    expect(store.receipts).toHaveLength(1);
  });

  it('allows reissue from voided receipt', async () => {
    const store = createMockStore();
    seedReceiptData(store);
    const receipt = await receiptCreateMain({ ...context(store, '2026-04-28T10:00:00.000Z'), billIds: ['bill_paid'] } as any);
    await receiptVoidMain({ ...context(store, '2026-04-28T11:00:00.000Z'), receiptId: receipt.id, voidReason: '金额录错' } as any);

    const reissued = await receiptCreateMain({
      ...context(store, '2026-04-28T12:00:00.000Z'),
      billIds: ['bill_paid'],
      reissueFromReceiptId: receipt.id
    } as any);

    expect(reissued.id).not.toBe(receipt.id);
    expect(reissued.receiptNo).not.toBe(receipt.receiptNo);
    expect(reissued.reissueFromReceiptId).toBe(receipt.id);
    expect(store.receipts).toHaveLength(2);
  });
});
