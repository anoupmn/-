import { main as receiptListMain } from '../../cloudfunctions/receipt-list/index';
import { main as receiptLeaseOptionsMain } from '../../cloudfunctions/receipt-lease-options/index';
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
    note: '',
    status: 'active',
    createdAt: '2026-05-04T00:00:00.000Z',
    updatedAt: '2026-05-04T00:00:00.000Z',
    ...overrides
  };
}

function seedReceiptListData(store: ReturnType<typeof createMockStore>) {
  store.assets.push({ id: 'asset_1', landlordOpenId: 'openid', name: '152号楼', rentalMode: 'split', createdAt: '', updatedAt: '' });
  store.rooms.push({ id: 'room_101', landlordOpenId: 'openid', assetId: 'asset_1', name: '101', isWholeUnitDefault: false, createdAt: '', updatedAt: '' });
  store.rooms.push({ id: 'room_102', landlordOpenId: 'openid', assetId: 'asset_1', name: '102', isWholeUnitDefault: false, createdAt: '', updatedAt: '' });
  store.tenants.push({ id: 'tenant_1', landlordOpenId: 'openid', name: '张三', createdAt: '', updatedAt: '' });
  store.tenants.push({ id: 'tenant_2', landlordOpenId: 'openid', name: '李四', createdAt: '', updatedAt: '' });
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
  store.receipts.push(
    receipt({ id: 'receipt_1' }),
    receipt({
      id: 'receipt_second_room',
      receiptNo: 'R202604280002',
      roomId: 'room_102',
      tenantId: 'tenant_2',
      billIds: ['bill_second_room'],
      roomName: '102',
      tenantName: '李四',
      items: [
        {
          billId: 'bill_second_room',
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
  store.bills.push(
    {
      id: 'bill_new_month',
      landlordOpenId: 'openid',
      leaseId: 'lease_1',
      roomId: 'room_101',
      type: 'rent',
      section: 'rent',
      dueDate: '2026-05-01',
      amount: 2600,
      status: 'paid',
      receivedAt: '2026-05-03T00:00:00.000Z',
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
      id: 'bill_already_receipted',
      landlordOpenId: 'openid',
      leaseId: 'lease_1',
      roomId: 'room_101',
      type: 'management',
      section: 'non_rent',
      dueDate: '2026-04-01',
      amount: 100,
      status: 'paid',
      receivedAt: '2026-04-03T00:00:00.000Z',
      receivedAmount: 100,
      source: 'system',
      feeNature: 'recurring',
      responsibility: 'tenant',
      cadence: 'cycle',
      isDepositLike: false,
      isOneTime: false,
      receiptId: 'receipt_1',
      receiptNo: 'R202604280001',
      createdAt: '',
      updatedAt: ''
    },
    {
      id: 'bill_april_unreceipted',
      landlordOpenId: 'openid',
      leaseId: 'lease_1',
      roomId: 'room_101',
      type: 'water',
      section: 'non_rent',
      dueDate: '2026-04-01',
      amount: 80,
      status: 'paid',
      receivedAt: '2026-04-04T00:00:00.000Z',
      receivedAmount: 80,
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
      id: 'receipt_second_room',
      monthKey: '2026-04',
      assetName: '152号楼',
      roomName: '102',
      tenantName: '李四',
      billCount: 1,
      billIds: ['bill_second_room']
    });
  });

  it('filters receipts by bill month asset room and tenant', async () => {
    const store = createMockStore();
    seedReceiptListData(store);

    const result = await callList(store, {
      month: '2026-04',
      assetId: 'asset_1',
      roomId: 'room_102',
      tenantId: 'tenant_2'
    });

    expect(result.receipts).toHaveLength(1);
    expect(result.receipts[0].id).toBe('receipt_second_room');
  });

  it('filters receipts by lease id', async () => {
    const store = createMockStore();
    seedReceiptListData(store);

    const result = await callList(store, { leaseId: 'lease_1' });

    expect(result.receipts.map((item: any) => item.id)).toContain('receipt_1');
    expect(result.receipts.map((item: any) => item.leaseId)).toEqual(
      expect.arrayContaining(['lease_1'])
    );
  });

  it('lists lease month options for opening receipts by lease', async () => {
    const store = createMockStore();
    seedReceiptListData(store);

    const result = await receiptLeaseOptionsMain({
      __mockDb: createMockDb(store),
      __mockContext: {
        getWXContext: () => getWXContext('openid')
      }
    } as any);

    expect(result.leases).toHaveLength(1);
    expect(result.leases[0]).toMatchObject({
      leaseId: 'lease_1',
      label: '152号楼 / 101 / 张三（2026-04-01 至 2026-12-31）'
    });
    expect(result.leases[0].months.map((item: any) => item.month)).not.toContain('2026-04');
    expect(result.leases[0].months).toEqual([
      expect.objectContaining({
        month: '2026-05',
        monthLabel: '2026年05月',
        billCount: 1,
        totalAmount: 2600
      })
    ]);
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
