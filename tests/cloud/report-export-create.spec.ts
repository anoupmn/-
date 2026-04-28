import { main as reportExportCreateMain } from '../../cloudfunctions/report-export-create/index';
import { main as reportExportDeleteMain } from '../../cloudfunctions/report-export-delete/index';
import { main as reportExportListMain } from '../../cloudfunctions/report-export-list/index';
import { createMockDb, createMockStore, getWXContext } from '../helpers/mock-cloud';

function seedReportData(store: ReturnType<typeof createMockStore>) {
  store.assets.push(
    { id: 'asset_1', landlordOpenId: 'openid', name: '152号楼', rentalMode: 'split', createdAt: '', updatedAt: '' },
    { id: 'asset_2', landlordOpenId: 'openid', name: '153号楼', rentalMode: 'split', createdAt: '', updatedAt: '' },
    { id: 'asset_other', landlordOpenId: 'other', name: '其他房东楼', rentalMode: 'split', createdAt: '', updatedAt: '' }
  );
  store.rooms.push(
    { id: 'room_101', landlordOpenId: 'openid', assetId: 'asset_1', name: '101', isWholeUnitDefault: false, createdAt: '', updatedAt: '' },
    { id: 'room_102', landlordOpenId: 'openid', assetId: 'asset_1', name: '102', isWholeUnitDefault: false, createdAt: '', updatedAt: '' },
    { id: 'room_201', landlordOpenId: 'openid', assetId: 'asset_2', name: '201', isWholeUnitDefault: false, createdAt: '', updatedAt: '' },
    { id: 'room_other', landlordOpenId: 'other', assetId: 'asset_other', name: '999', isWholeUnitDefault: false, createdAt: '', updatedAt: '' }
  );
  store.tenants.push(
    { id: 'tenant_1', landlordOpenId: 'openid', name: '张三', createdAt: '', updatedAt: '' },
    { id: 'tenant_2', landlordOpenId: 'openid', name: '李四', createdAt: '', updatedAt: '' }
  );
  store.leases.push(
    {
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
    },
    {
      id: 'lease_2',
      landlordOpenId: 'openid',
      roomId: 'room_102',
      tenantId: 'tenant_2',
      startDate: '2026-04-01',
      endDate: '2026-12-31',
      billingCycleDays: 30,
      rentAmount: 2200,
      depositAmount: 2200,
      closedAt: null,
      createdAt: '',
      updatedAt: ''
    }
  );
  store.bills.push(
    {
      id: 'bill_rent',
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
      id: 'bill_water',
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
      meterReading: { previousReading: 100, currentReading: 115, usage: 15, unitPrice: 3 },
      feeNature: 'one_time',
      responsibility: 'tenant',
      cadence: 'once',
      isDepositLike: false,
      isOneTime: true,
      createdAt: '',
      updatedAt: ''
    },
    {
      id: 'bill_electricity',
      landlordOpenId: 'openid',
      leaseId: 'lease_1',
      roomId: 'room_101',
      type: 'electricity',
      section: 'non_rent',
      dueDate: '2026-04-01',
      amount: 80,
      status: 'pending',
      receivedAt: null,
      receivedAmount: null,
      source: 'manual',
      meterReading: { previousReading: 200, currentReading: 240, usage: 40, unitPrice: 2 },
      feeNature: 'one_time',
      responsibility: 'tenant',
      cadence: 'once',
      isDepositLike: false,
      isOneTime: true,
      createdAt: '',
      updatedAt: ''
    },
    {
      id: 'bill_other_room',
      landlordOpenId: 'openid',
      leaseId: 'lease_2',
      roomId: 'room_102',
      type: 'rent',
      section: 'rent',
      dueDate: '2026-04-01',
      amount: 2200,
      status: 'pending',
      receivedAt: null,
      receivedAmount: null,
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
      id: 'bill_other_landlord',
      landlordOpenId: 'other',
      leaseId: 'lease_other',
      roomId: 'room_other',
      type: 'rent',
      section: 'rent',
      dueDate: '2026-04-01',
      amount: 9999,
      status: 'paid',
      receivedAt: '2026-04-01T00:00:00.000Z',
      receivedAmount: 9999,
      feeNature: 'recurring',
      responsibility: 'tenant',
      cadence: 'cycle',
      isDepositLike: false,
      isOneTime: false,
      createdAt: '',
      updatedAt: ''
    }
  );
  store.ownerExpenses.push(
    {
      id: 'expense_repair',
      landlordOpenId: 'openid',
      assetId: 'asset_1',
      roomId: 'room_101',
      leaseId: 'lease_1',
      tenantId: 'tenant_1',
      repairRecordId: 'repair_1',
      expenseType: 'repair',
      amount: 300,
      note: '水龙头维修',
      occurredAt: '2026-04-08',
      monthKey: '2026-04',
      createdAt: '',
      updatedAt: ''
    },
    {
      id: 'expense_cleaning',
      landlordOpenId: 'openid',
      assetId: 'asset_1',
      roomId: 'room_101',
      leaseId: 'lease_1',
      tenantId: 'tenant_1',
      repairRecordId: null,
      expenseType: 'cleaning',
      amount: 120,
      note: '保洁',
      occurredAt: '2026-04-09',
      monthKey: '2026-04',
      createdAt: '',
      updatedAt: ''
    }
  );
}

function callReport(store: ReturnType<typeof createMockStore>, data: Record<string, unknown> = {}) {
  return reportExportCreateMain({
    month: '2026-04',
    __mockDb: createMockDb(store),
    __mockContext: {
      getWXContext: () => getWXContext('openid')
    },
    now: '2026-04-28T10:00:00.000Z',
    ...data
  } as any);
}

function eventContext(store: ReturnType<typeof createMockStore>) {
  return {
    __mockDb: createMockDb(store),
    __mockContext: {
      getWXContext: () => getWXContext('openid')
    },
    now: '2026-04-28T10:00:00.000Z'
  };
}

describe('report-export-create cloud function', () => {
  it('builds required workbook sheets for selected month', async () => {
    const store = createMockStore();
    seedReportData(store);

    const result = await callReport(store);

    expect(result.sheetNames).toEqual(['月度明细', '账单明细', '房东支出明细', '退租支出明细']);
    expect(result.workbook.月度明细).toHaveLength(3);
    expect(result.workbook.账单明细.map((row: any) => row.应收金额)).not.toContain(9999);
    expect(result.summary.billCount).toBe(4);
  });

  it('filters export by asset and room', async () => {
    const store = createMockStore();
    seedReportData(store);

    const assetResult = await callReport(store, { assetId: 'asset_1' });
    const roomResult = await callReport(store, { roomId: 'room_101' });

    expect(assetResult.workbook.月度明细.map((row: any) => row['房号/房间'])).toEqual(['101', '102']);
    expect(roomResult.workbook.月度明细.map((row: any) => row['房号/房间'])).toEqual(['101']);
  });

  it('keeps owner expenses out of tenant income total', async () => {
    const store = createMockStore();
    seedReportData(store);

    const result = await callReport(store, { roomId: 'room_101' });
    const row = result.workbook.月度明细[0];

    expect(row.维修费).toBe(300);
    expect(row.其他支出).toBe(120);
    expect(row.房租水电合计).toBe(2725);
    expect(result.summary.ownerExpenseTotal).toBe(420);
  });

  it('includes meter readings in monthly detail rows', async () => {
    const store = createMockStore();
    seedReportData(store);

    const result = await callReport(store, { roomId: 'room_101' });
    const row = result.workbook.月度明细[0];

    expect(row['水（上月）']).toBe(100);
    expect(row['水（本月）']).toBe(115);
    expect(row['实用（方）']).toBe(15);
    expect(row['电（上月）']).toBe(200);
    expect(row['电（本月）']).toBe(240);
    expect(row['实用（度）']).toBe(40);
  });

  it('lists and deletes report export records for current landlord', async () => {
    const store = createMockStore();
    seedReportData(store);
    const created = await callReport(store, { assetId: 'asset_1' });
    store.reportExports.push({
      id: 'export_other',
      landlordOpenId: 'other',
      month: '2026-04',
      assetId: null,
      roomId: null,
      scopeLabel: '其他房东',
      fileName: 'other.xlsx',
      sheetNames: [],
      summary: {
        roomCount: 0,
        billCount: 0,
        ownerExpenseCount: 0,
        tenantIncomeTotal: 0,
        receivedTotal: 0,
        unpaidTotal: 0,
        ownerExpenseTotal: 0
      },
      createdAt: '2026-04-28T10:00:00.000Z',
      updatedAt: '2026-04-28T10:00:00.000Z'
    });

    const listResult = await reportExportListMain(eventContext(store));
    expect(listResult.exports).toHaveLength(1);
    expect(listResult.exports[0].scopeLabel).toBe('152号楼');

    await reportExportDeleteMain({
      ...eventContext(store),
      exportId: store.reportExports.find((item) => item.fileName === created.fileName)?.id
    } as any);

    expect(store.reportExports.map((item) => item.id)).toEqual(['export_other']);
  });
});
