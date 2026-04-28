import { COLLECTIONS } from '../constants/collections';
import type { Asset } from '../schemas/asset';
import type { Bill } from '../schemas/bill';
import type { Lease } from '../schemas/lease';
import type { OwnerExpense } from '../schemas/owner-expense';
import {
  reportExportMetadataSchema,
  reportExportRequestSchema,
  type BillDetailRow,
  type MonthlyDetailRow,
  type OwnerExpenseDetailRow,
  type ReportExportRequest,
  type ReportWorkbookData
} from '../schemas/report-export';
import type { Room } from '../schemas/room';
import type { Tenant } from '../schemas/tenant';
import { createId, insertRecord, listAll, resolveNow, type CloudEventBase, type DbLike } from '../runtime';
import { findById, removeRecordsByQuery } from '../runtime';

export const REPORT_SHEET_NAMES = ['月度明细', '账单明细', '房东支出明细', '退租支出明细'] as const;

const BILL_TYPE_LABELS: Record<string, string> = {
  rent: '房租',
  deposit: '押金',
  management: '管理费',
  fire_deposit: '消防押金',
  lock_card_deposit: '锁卡押金',
  water: '水费',
  electricity: '电费',
  property: '物业费',
  misc: '其他费用',
  custom: '自定义费用'
};

const FEE_NATURE_LABELS: Record<string, string> = {
  recurring: '周期性费用',
  one_time: '一次性费用',
  deposit: '押金类费用'
};

const OWNER_EXPENSE_LABELS: Record<string, string> = {
  repair: '维修',
  cleaning: '保洁',
  caretaking: '打理',
  labor: '请人管理',
  other: '其他'
};

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function monthOf(date?: string | null) {
  return String(date || '').slice(0, 7);
}

function isPaid(bill: Bill) {
  return Boolean(bill.receivedAt) && bill.receivedAmount !== null;
}

function sumBills(bills: Bill[], pickAmount: (bill: Bill) => number) {
  return roundMoney(bills.reduce((sum, bill) => sum + pickAmount(bill), 0));
}

function sumExpenses(expenses: OwnerExpense[]) {
  return roundMoney(expenses.reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0));
}

function billLabel(bill: Bill) {
  return bill.itemLabel || BILL_TYPE_LABELS[bill.type] || bill.type;
}

function findRoomAsset(room: Room | undefined, assetsById: Map<string, Asset>) {
  return room ? assetsById.get(room.assetId) : undefined;
}

function roomInScope(room: Room, request: ReportExportRequest) {
  if (request.roomId && room.id !== request.roomId) {
    return false;
  }

  if (request.assetId && room.assetId !== request.assetId) {
    return false;
  }

  return true;
}

function resolveTenantName(roomBills: Bill[], leasesById: Map<string, Lease>, tenantsById: Map<string, Tenant>) {
  const lease = roomBills.map((bill) => leasesById.get(bill.leaseId)).find(Boolean);
  return lease ? tenantsById.get(lease.tenantId)?.name ?? '' : '';
}

function buildMonthlyRow(input: {
  index: number;
  room: Room;
  asset?: Asset;
  tenantName: string;
  bills: Bill[];
  ownerExpenses: OwnerExpense[];
}): MonthlyDetailRow {
  const waterBill = input.bills.find((bill) => bill.type === 'water' && bill.meterReading);
  const electricBill = input.bills.find((bill) => bill.type === 'electricity' && bill.meterReading);
  const rentBills = input.bills.filter((bill) => bill.type === 'rent');
  const managementBills = input.bills.filter((bill) => bill.type === 'management');
  const utilityBills = input.bills.filter((bill) => bill.type === 'water' || bill.type === 'electricity');
  const otherReceivableBills = input.bills.filter(
    (bill) => !['rent', 'management', 'water', 'electricity'].includes(bill.type)
  );
  const repairExpenses = input.ownerExpenses.filter((expense) => expense.expenseType === 'repair');
  const otherExpenses = input.ownerExpenses.filter((expense) => expense.expenseType !== 'repair');
  const tenantIncomeBills = input.bills.filter((bill) => bill.responsibility === 'tenant');
  const paidThisMonth = tenantIncomeBills.filter(isPaid);
  const unpaidThisMonth = tenantIncomeBills.filter((bill) => !isPaid(bill));

  return {
    序号: input.index,
    '房源/楼栋': input.asset?.name ?? '',
    '房号/房间': input.room.name,
    租客: input.tenantName,
    '水（上月）': waterBill?.meterReading?.previousReading ?? '',
    '水（本月）': waterBill?.meterReading?.currentReading ?? '',
    '实用（方）': waterBill?.meterReading?.usage ?? '',
    水费: sumBills(input.bills.filter((bill) => bill.type === 'water'), (bill) => bill.amount),
    '电（上月）': electricBill?.meterReading?.previousReading ?? '',
    '电（本月）': electricBill?.meterReading?.currentReading ?? '',
    '实用（度）': electricBill?.meterReading?.usage ?? '',
    电费: sumBills(input.bills.filter((bill) => bill.type === 'electricity'), (bill) => bill.amount),
    '房租（元）': sumBills(rentBills, (bill) => bill.amount),
    管理费: sumBills(managementBills, (bill) => bill.amount),
    其他应收: sumBills(otherReceivableBills, (bill) => bill.amount),
    维修费: sumExpenses(repairExpenses),
    其他支出: sumExpenses(otherExpenses),
    退租支出: 0,
    房租水电合计: sumBills([...rentBills, ...managementBills, ...utilityBills, ...otherReceivableBills], (bill) => bill.amount),
    本月实收: sumBills(paidThisMonth, (bill) => bill.receivedAmount ?? 0),
    本月未收: sumBills(unpaidThisMonth, (bill) => bill.amount),
    备注: input.bills.map((bill) => bill.note).filter(Boolean).join('；')
  };
}

function buildBillDetailRows(input: {
  bills: Bill[];
  roomsById: Map<string, Room>;
  assetsById: Map<string, Asset>;
  leasesById: Map<string, Lease>;
  tenantsById: Map<string, Tenant>;
}): BillDetailRow[] {
  return input.bills.map((bill) => {
    const room = input.roomsById.get(bill.roomId);
    const asset = findRoomAsset(room, input.assetsById);
    const lease = input.leasesById.get(bill.leaseId);
    const tenant = lease ? input.tenantsById.get(lease.tenantId) : undefined;
    return {
      '房源/楼栋': asset?.name ?? '',
      '房号/房间': room?.name ?? '',
      租客: tenant?.name ?? '',
      费用类型: billLabel(bill),
      费用性质: FEE_NATURE_LABELS[String(bill.feeNature)] ?? String(bill.feeNature),
      应收日期: bill.dueDate,
      应收金额: bill.amount,
      实收日期: bill.receivedAt ?? '',
      实收金额: bill.receivedAmount ?? '',
      状态: bill.status,
      来源: bill.source === 'manual' ? '手工补录' : '系统生成',
      上期读数: bill.meterReading?.previousReading ?? '',
      本期读数: bill.meterReading?.currentReading ?? '',
      用量: bill.meterReading?.usage ?? '',
      单价: bill.meterReading?.unitPrice ?? '',
      备注: bill.note ?? ''
    };
  });
}

function buildOwnerExpenseRows(input: {
  ownerExpenses: OwnerExpense[];
  roomsById: Map<string, Room>;
  assetsById: Map<string, Asset>;
}): OwnerExpenseDetailRow[] {
  return input.ownerExpenses.map((expense) => {
    const room = expense.roomId ? input.roomsById.get(expense.roomId) : undefined;
    const asset = input.assetsById.get(expense.assetId);
    return {
      '房源/楼栋': asset?.name ?? '',
      '房号/房间': room?.name ?? '',
      支出类型: OWNER_EXPENSE_LABELS[expense.expenseType] ?? expense.expenseType,
      发生日期: expense.occurredAt,
      金额: expense.amount ?? '',
      是否计入问题分析: expense.expenseType === 'repair' ? '是' : '否',
      备注: expense.note ?? ''
    };
  });
}

export async function buildMonthlyReportData(
  db: DbLike,
  landlordOpenId: string,
  rawRequest: ReportExportRequest
): Promise<ReportWorkbookData> {
  const request = reportExportRequestSchema.parse(rawRequest);
  const [assets, rooms, tenants, leases, bills, ownerExpenses] = await Promise.all([
    listAll<Asset>(db, COLLECTIONS.assets),
    listAll<Room>(db, COLLECTIONS.rooms),
    listAll<Tenant>(db, COLLECTIONS.tenants),
    listAll<Lease>(db, COLLECTIONS.leases),
    listAll<Bill>(db, COLLECTIONS.bills),
    listAll<OwnerExpense>(db, COLLECTIONS.ownerExpenses)
  ]);

  const scopedAssets = assets.filter((asset) => asset.landlordOpenId === landlordOpenId);
  const scopedRooms = rooms
    .filter((room) => room.landlordOpenId === landlordOpenId)
    .filter((room) => roomInScope(room, request));
  const scopedRoomIds = new Set(scopedRooms.map((room) => room.id));
  const assetsById = new Map(scopedAssets.map((asset) => [asset.id, asset]));
  const roomsById = new Map(scopedRooms.map((room) => [room.id, room]));
  const tenantsById = new Map(tenants.filter((tenant) => tenant.landlordOpenId === landlordOpenId).map((tenant) => [tenant.id, tenant]));
  const leasesById = new Map(leases.filter((lease) => lease.landlordOpenId === landlordOpenId).map((lease) => [lease.id, lease]));
  const scopedBills = bills
    .filter((bill) => bill.landlordOpenId === landlordOpenId)
    .filter((bill) => scopedRoomIds.has(bill.roomId))
    .filter((bill) => monthOf(bill.dueDate) === request.month);
  const scopedExpenses = ownerExpenses
    .filter((expense) => expense.landlordOpenId === landlordOpenId)
    .filter((expense) => !expense.roomId || scopedRoomIds.has(expense.roomId))
    .filter((expense) => (expense.monthKey || monthOf(expense.occurredAt)) === request.month);

  const 月度明细 = scopedRooms.map((room, index) => {
    const roomBills = scopedBills.filter((bill) => bill.roomId === room.id);
    return buildMonthlyRow({
      index: index + 1,
      room,
      asset: findRoomAsset(room, assetsById),
      tenantName: resolveTenantName(roomBills, leasesById, tenantsById),
      bills: roomBills,
      ownerExpenses: scopedExpenses.filter((expense) => expense.roomId === room.id)
    });
  });

  return {
    月度明细,
    账单明细: buildBillDetailRows({ bills: scopedBills, roomsById, assetsById, leasesById, tenantsById }),
    房东支出明细: buildOwnerExpenseRows({ ownerExpenses: scopedExpenses, roomsById, assetsById }),
    退租支出明细: []
  };
}

export function summarizeReportWorkbook(workbook: ReportWorkbookData) {
  return {
    roomCount: workbook.月度明细.length,
    billCount: workbook.账单明细.length,
    ownerExpenseCount: workbook.房东支出明细.length,
    tenantIncomeTotal: roundMoney(workbook.月度明细.reduce((sum, row) => sum + row.房租水电合计, 0)),
    receivedTotal: roundMoney(workbook.月度明细.reduce((sum, row) => sum + row.本月实收, 0)),
    unpaidTotal: roundMoney(workbook.月度明细.reduce((sum, row) => sum + row.本月未收, 0)),
    ownerExpenseTotal: roundMoney(
      workbook.月度明细.reduce((sum, row) => sum + row.维修费 + row.其他支出 + row.退租支出, 0)
    )
  };
}

export async function resolveReportScopeLabel(db: DbLike, landlordOpenId: string, request: ReportExportRequest) {
  if (request.roomId) {
    const [rooms, assets] = await Promise.all([
      listAll<Room>(db, COLLECTIONS.rooms),
      listAll<Asset>(db, COLLECTIONS.assets)
    ]);
    const room = rooms.find((item) => item.id === request.roomId && item.landlordOpenId === landlordOpenId);
    const asset = room ? assets.find((item) => item.id === room.assetId && item.landlordOpenId === landlordOpenId) : null;
    return `${asset?.name ?? '未知房源'} / ${room?.name ?? '未知房间'}`;
  }

  if (request.assetId) {
    const assets = await listAll<Asset>(db, COLLECTIONS.assets);
    return assets.find((item) => item.id === request.assetId && item.landlordOpenId === landlordOpenId)?.name ?? '未知房源';
  }

  return '全部房源';
}

export async function listReportExports(db: DbLike, landlordOpenId: string) {
  const records = await listAll(db, COLLECTIONS.reportExports);
  return records
    .filter((record) => record.landlordOpenId === landlordOpenId)
    .map((record) => reportExportMetadataSchema.parse(record))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteReportExport(db: DbLike, landlordOpenId: string, exportId: string) {
  const record = await findById(db, COLLECTIONS.reportExports, exportId);
  const parsed = record ? reportExportMetadataSchema.parse(record) : null;

  if (!parsed || parsed.landlordOpenId !== landlordOpenId) {
    throw new Error(`Report export ${exportId} not found.`);
  }

  await removeRecordsByQuery(db, COLLECTIONS.reportExports, {
    id: exportId,
    landlordOpenId
  });

  return parsed;
}

export async function saveReportExportMetadata(
  db: DbLike,
  landlordOpenId: string,
  request: ReportExportRequest,
  fileName: string,
  scopeLabel: string,
  sheetNames: string[],
  summary: ReturnType<typeof summarizeReportWorkbook>,
  event: CloudEventBase,
  fileID?: string
) {
  const now = resolveNow(event);
  const metadata = reportExportMetadataSchema.parse({
    id: createId('report_export'),
    landlordOpenId,
    month: request.month,
    assetId: request.assetId ?? null,
    roomId: request.roomId ?? null,
    scopeLabel,
    fileID,
    fileName,
    sheetNames,
    summary,
    createdAt: now,
    updatedAt: now
  });

  await insertRecord(db, COLLECTIONS.reportExports, metadata);
  return metadata;
}
