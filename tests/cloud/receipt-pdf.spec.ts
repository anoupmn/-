import { main as receiptPdfMain } from '../../cloudfunctions/receipt-pdf/index';
import { createMockDb, createMockStore, getWXContext } from '../helpers/mock-cloud';

describe('receipt-pdf cloud function', () => {
  it('builds a printable pdf for a receipt snapshot', async () => {
    const store = createMockStore();
    store.leases.push({
      id: 'lease_1',
      landlordOpenId: 'openid',
      roomId: 'room_101',
      tenantId: 'tenant_1',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      billingCycleDays: 30,
      rentAmount: 2600,
      depositAmount: 2600,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    });
    store.receipts.push({
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
          receivedAt: '2026-04-05T00:00:00.000Z',
          receivedAmount: 2600,
          note: ''
        }
      ],
      totalAmount: 2600,
      receivedAt: '2026-04-05T00:00:00.000Z',
      note: '',
      status: 'active',
      createdAt: '2026-04-28T10:00:00.000Z',
      updatedAt: '2026-04-28T10:00:00.000Z'
    });

    const result = await receiptPdfMain({
      __mockDb: createMockDb(store),
      __mockContext: {
        getWXContext: () => getWXContext('openid')
      },
      now: '2026-04-28T12:00:00.000Z',
      receiptId: 'receipt_1'
    } as any);

    expect(result.fileName).toBe('收款收据-房源152号楼-房间101-租约2026-01-01至2026-12-31-租客张三-R202604280001.pdf');
    expect(result.contentType).toBe('application/pdf');
    expect(result.size).toBeGreaterThan(100);
    const pdf = Buffer.from(result.pdfBase64 || '', 'base64').toString('binary');
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf).toContain('/Helvetica');
  });
});
