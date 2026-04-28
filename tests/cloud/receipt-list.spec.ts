import { main as receiptListMain } from '../../cloudfunctions/receipt-list/index';
import { createMockDb, createMockStore, getWXContext } from '../helpers/mock-cloud';

function receipt(overrides: Record<string, unknown>) {
  return {
    id: 'receipt_1',
    receiptNo: 'R202604280001',
    landlordOpenId: 'openid',
    leaseId: 'lease_1',
    roomId: 'room_101',
    tenantId: 'tenant_1',
    assetId: 'asset_1',
    billIds: ['bill_paid'],
    title: '收款收据（非发票）',
    assetName: '152号楼',
    roomName: '101',
    tenantName: '张三',
    items: [
      {
        billId: 'bill_paid',
        type: 'rent',
        feeNature: 'recurring',
        itemLabel: '房租',
        dueDate: '2026-04-01',
        amount: 2600,
        receivedAt: '2026-05-03T00:00:00.000Z',
        receivedAmount: 2600,
        note: ''
      }
    ],
    totalAmount: 2600,
    receivedAt: '2026-05-03T00:00:00.000Z',
    collectorName: '房东',
    note: '',
    status: 'active',
    voidedAt: null,
    voidReason: null,
    reissueFromReceiptId: null,
    createdAt: '2026-05-04T00:00:00.000Z',
    updatedAt: '2026-05-04T00:00:00.000Z',
    ...overrides
  };
}

function seedReceiptListData(store: ReturnType<typeof createMockStore>) {
  store.receipts.push(
    receipt({ id: 'receipt_1' }),
    receipt({
      id: 'receipt_voided',
      receiptNo: 'R202604280002',
      roomId: 'room_102',
      tenantId: 'tenant_2',
      billIds: ['bill_voided'],
      roomName: '102',
      tenantName: '李四',
      status: 'voided',
      voidReason: '金额录错',
      voidedAt: '2026-05-05T00:00:00.000Z',
      items: [
        {
          billId: 'bill_voided',
          type: 'rent',
          feeNature: 'recurring',
          itemLabel: '房租',
          dueDate: '2026-04-01',
          amount: 2200,
          receivedAt: '2026-04-20T00:00:00.000Z',
          receivedAmount: 2200,
          note: ''
        }
      ],
      totalAmount: 2200,
      receivedAt: '2026-04-20T00:00:00.000Z',
      createdAt: '2026-05-05T00:00:00.000Z',
      updatedAt: '2026-05-05T00:00:00.000Z'
    }),
    receipt({
      id: 'receipt_other_month',
      receiptNo: 'R202603280001',
      billIds: ['bill_march'],
      items: [
        {
          billId: 'bill_march',
          type: 'rent',
          feeNature: 'recurring',
          itemLabel: '房租',
          dueDate: '2026-03-01',
          amount: 2600,
          receivedAt: '2026-04-01T00:00:00.000Z',
          receivedAmount: 2600,
          note: ''
        }
      ],
      createdAt: '2026-04-02T00:00:00.000Z',
      updatedAt: '2026-04-02T00:00:00.000Z'
    }),
    receipt({
      id: 'receipt_other_landlord',
      receiptNo: 'R202604999999',
      landlordOpenId: 'other',
      billIds: ['bill_other'],
      totalAmount: 9999
    })
  );
}

function callList(store: ReturnType<typeof createMockStore>, filters: Record<string, unknown> = {}) {
  return receiptListMain({
    __mockDb: createMockDb(store),
    __mockContext: {
      getWXContext: () => getWXContext('openid')
    },
    filters
  } as any);
}

describe('receipt-list cloud function', () => {
  it('lists receipt snapshot rows for current landlord', async () => {
    const store = createMockStore();
    seedReceiptListData(store);

    const result = await callList(store);

    expect(result.receipts.map((item: any) => item.receiptNo)).toEqual([
      'R202604280002',
      'R202604280001',
      'R202603280001'
    ]);
    expect(result.receipts[0]).toMatchObject({
      id: 'receipt_voided',
      monthKey: '2026-04',
      assetName: '152号楼',
      roomName: '102',
      tenantName: '李四',
      status: 'voided',
      voidReason: '金额录错',
      billCount: 1,
      billIds: ['bill_voided']
    });
  });

  it('filters receipts by bill month asset room tenant and status', async () => {
    const store = createMockStore();
    seedReceiptListData(store);

    const result = await callList(store, {
      month: '2026-04',
      assetId: 'asset_1',
      roomId: 'room_102',
      tenantId: 'tenant_2',
      status: 'voided'
    });

    expect(result.receipts).toHaveLength(1);
    expect(result.receipts[0].id).toBe('receipt_voided');
  });

  it('keeps other landlord receipts out of results', async () => {
    const store = createMockStore();
    seedReceiptListData(store);

    const result = await callList(store, { month: '2026-04', status: 'all' });

    expect(result.receipts.map((item: any) => item.id)).not.toContain('receipt_other_landlord');
    expect(result.receipts.map((item: any) => item.totalAmount)).not.toContain(9999);
  });

  it('uses snapshot names instead of current room or tenant names', async () => {
    const store = createMockStore();
    seedReceiptListData(store);
    store.rooms.push({ id: 'room_101', landlordOpenId: 'openid', assetId: 'asset_1', name: '新房号', createdAt: '', updatedAt: '' });
    store.tenants.push({ id: 'tenant_1', landlordOpenId: 'openid', name: '新租客名', createdAt: '', updatedAt: '' });

    const result = await callList(store, { roomId: 'room_101' });

    expect(result.receipts[0].roomName).toBe('101');
    expect(result.receipts[0].tenantName).toBe('张三');
  });
});
