import { main as receiptCreateMain } from '../../cloudfunctions/receipt-create/index';
import { main as receiptDeleteMain } from '../../cloudfunctions/receipt-delete/index';
import { main as receiptLeaseOptionsMain } from '../../cloudfunctions/receipt-lease-options/index';
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

describe('receipt-delete cloud function', () => {
  it('deletes receipt record and unlocks its bills for monthly reissue', async () => {
    const store = createMockStore();
    seedReceiptData(store);
    const receipt = await receiptCreateMain({ ...context(store, '2026-04-28T10:00:00.000Z'), month: '2026-04', leaseId: 'lease_1' } as any);

    const result = await receiptDeleteMain({
      ...context(store, '2026-04-28T11:00:00.000Z'),
      receiptId: receipt.id
    } as any);

    expect(result).toMatchObject({
      deleted: true,
      deletedReceiptId: receipt.id,
      unlinkedBillCount: 1
    });
    expect(store.receipts).toHaveLength(0);
    expect(store.bills[0].receiptId).toBe('');
    expect(store.bills[0].receiptNo).toBe('');

    const options = await receiptLeaseOptionsMain(context(store, '2026-04-28T12:00:00.000Z') as any);
    expect(options.leases[0].months[0].month).toBe('2026-04');
  });

  it('rejects deleting another landlord receipt', async () => {
    const store = createMockStore();
    seedReceiptData(store);
    const receipt = await receiptCreateMain({ ...context(store, '2026-04-28T10:00:00.000Z'), billIds: ['bill_paid'] } as any);

    await expect(
      receiptDeleteMain({
        __mockDb: createMockDb(store),
        __mockContext: {
          getWXContext: () => getWXContext('other-openid')
        },
        now: '2026-04-28T11:00:00.000Z',
        receiptId: receipt.id
      } as any)
    ).rejects.toThrow('not found');
  });
});
