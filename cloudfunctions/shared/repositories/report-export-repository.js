"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REPORT_SHEET_NAMES = void 0;
exports.buildMonthlyReportData = buildMonthlyReportData;
exports.summarizeReportWorkbook = summarizeReportWorkbook;
exports.resolveReportScopeLabel = resolveReportScopeLabel;
exports.listReportExports = listReportExports;
exports.deleteReportExport = deleteReportExport;
exports.saveReportExportMetadata = saveReportExportMetadata;
const collections_1 = require("../constants/collections");
const report_export_1 = require("../schemas/report-export");
const runtime_1 = require("../runtime");
const runtime_2 = require("../runtime");
exports.REPORT_SHEET_NAMES = ['月度明细', '账单明细', '房东支出明细', '退租支出明细'];
const BILL_TYPE_LABELS = {
    rent: '房租',
    deposit: '押金',
    management: '管理费',
    fire_deposit: '消防押金',
    lock_card_deposit: '锁卡押金',
    water: '水费',
    electricity: '电费',
    property: '物业费',
    misc: '其他费用',
    custom: '自定义费用',
    rent_refund: '余下租金',
    deposit_refund: '退还押金'
};
const FEE_NATURE_LABELS = {
    recurring: '周期性费用',
    one_time: '一次性费用',
    deposit: '押金类费用'
};
const OWNER_EXPENSE_LABELS = {
    repair: '维修',
    cleaning: '保洁',
    caretaking: '打理',
    labor: '请人管理',
    other: '其他'
};
function roundMoney(value) {
    return Math.round(value * 100) / 100;
}
function monthOf(date) {
    return String(date || '').slice(0, 7);
}
function isPaid(bill) {
    return Boolean(bill.receivedAt) && bill.receivedAmount !== null;
}
function sumBills(bills, pickAmount) {
    return roundMoney(bills.reduce((sum, bill) => sum + pickAmount(bill), 0));
}
function sumExpenses(expenses) {
    return roundMoney(expenses.reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0));
}
function billLabel(bill) {
    return bill.itemLabel || BILL_TYPE_LABELS[bill.type] || bill.type;
}
function findRoomAsset(room, assetsById) {
    return room ? assetsById.get(room.assetId) : undefined;
}
function roomInScope(room, request) {
    if (request.roomId && room.id !== request.roomId) {
        return false;
    }
    if (request.assetId && room.assetId !== request.assetId) {
        return false;
    }
    return true;
}
function resolveTenantName(roomBills, leasesById, tenantsById) {
    const lease = roomBills.map((bill) => leasesById.get(bill.leaseId)).find(Boolean);
    return lease ? tenantsById.get(lease.tenantId)?.name ?? '' : '';
}
function buildMonthlyRow(input) {
    const waterBill = input.bills.find((bill) => bill.type === 'water' && bill.meterReading);
    const electricBill = input.bills.find((bill) => bill.type === 'electricity' && bill.meterReading);
    const rentBills = input.bills.filter((bill) => bill.type === 'rent');
    const managementBills = input.bills.filter((bill) => bill.type === 'management');
    const utilityBills = input.bills.filter((bill) => bill.type === 'water' || bill.type === 'electricity');
    const otherReceivableBills = input.bills.filter((bill) => !['rent', 'management', 'water', 'electricity', 'rent_refund', 'deposit_refund'].includes(bill.type) && bill.responsibility !== 'landlord');
    const repairExpenses = input.ownerExpenses.filter((expense) => expense.expenseType === 'repair');
    const otherExpenses = input.ownerExpenses.filter((expense) => expense.expenseType !== 'repair');
    const tenantIncomeBills = input.bills.filter((bill) => bill.responsibility === 'tenant');
    const paidThisMonth = tenantIncomeBills.filter(isPaid);
    const unpaidThisMonth = tenantIncomeBills.filter((bill) => !isPaid(bill));
    const checkoutRefundBills = input.bills.filter((bill) => bill.responsibility === 'landlord' && ['rent_refund', 'deposit_refund'].includes(bill.type));
    const checkoutExpense = roundMoney(checkoutRefundBills.reduce((sum, bill) => sum + Number(bill.amount || 0), 0));
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
        退租支出: checkoutExpense,
        房租水电合计: sumBills([...rentBills, ...managementBills, ...utilityBills, ...otherReceivableBills], (bill) => bill.amount),
        本月实收: sumBills(paidThisMonth, (bill) => bill.receivedAmount ?? 0),
        本月未收: sumBills(unpaidThisMonth, (bill) => bill.amount),
        备注: input.bills.map((bill) => bill.note).filter(Boolean).join('；')
    };
}
function buildBillDetailRows(input) {
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
function buildOwnerExpenseRows(input) {
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
async function buildMonthlyReportData(db, landlordOpenId, rawRequest) {
    const request = report_export_1.reportExportRequestSchema.parse(rawRequest);
    const [assets, rooms, tenants, leases, bills, ownerExpenses] = await Promise.all([
        (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.assets),
        (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.rooms),
        (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.tenants),
        (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.leases),
        (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.bills),
        (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.ownerExpenses)
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
    const 退租支出明细账单 = scopedBills.filter((bill) => bill.responsibility === 'landlord' && ['rent_refund', 'deposit_refund'].includes(bill.type));
    const 退租支出明细 = 退租支出明细账单.map((bill) => {
        const lease = leasesById.get(bill.leaseId);
        const room = roomsById.get(bill.roomId);
        const tenant = lease ? tenantsById.get(lease.tenantId) : undefined;
        const asset = findRoomAsset(room, assetsById);
        return {
            '\u623f\u6e90/\u697c\u680b': asset?.name ?? '',
            '\u623f\u53f7/\u623f\u95f4': room?.name ?? '',
            '\u79df\u5ba2': tenant?.name ?? '',
            '\u79df\u7ea6': lease ? `${lease.startDate} ~ ${lease.endDate}` : '',
            '\u9000\u79df\u65e5\u671f': bill.dueDate,
            '\u652f\u51fa\u7c7b\u578b': bill.type === 'rent_refund' ? '\u4f59\u4e0b\u79df\u91d1' : '\u9000\u8fd8\u62bc\u91d1',
            '\u91d1\u989d': bill.amount,
            '\u5907\u6ce8': bill.note ?? ''
        };
    });
    return {
        月度明细,
        账单明细: buildBillDetailRows({ bills: scopedBills, roomsById, assetsById, leasesById, tenantsById }),
        房东支出明细: buildOwnerExpenseRows({ ownerExpenses: scopedExpenses, roomsById, assetsById }),
        退租支出明细
    };
}
function summarizeReportWorkbook(workbook) {
    return {
        roomCount: workbook.月度明细.length,
        billCount: workbook.账单明细.length,
        ownerExpenseCount: workbook.房东支出明细.length,
        tenantIncomeTotal: roundMoney(workbook.月度明细.reduce((sum, row) => sum + row.房租水电合计, 0)),
        receivedTotal: roundMoney(workbook.月度明细.reduce((sum, row) => sum + row.本月实收, 0)),
        unpaidTotal: roundMoney(workbook.月度明细.reduce((sum, row) => sum + row.本月未收, 0)),
        ownerExpenseTotal: roundMoney(workbook.月度明细.reduce((sum, row) => sum + row.维修费 + row.其他支出 + row.退租支出, 0))
    };
}
async function resolveReportScopeLabel(db, landlordOpenId, request) {
    if (request.roomId) {
        const [rooms, assets] = await Promise.all([
            (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.rooms),
            (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.assets)
        ]);
        const room = rooms.find((item) => item.id === request.roomId && item.landlordOpenId === landlordOpenId);
        const asset = room ? assets.find((item) => item.id === room.assetId && item.landlordOpenId === landlordOpenId) : null;
        return `${asset?.name ?? '未知房源'} / ${room?.name ?? '未知房间'}`;
    }
    if (request.assetId) {
        const assets = await (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.assets);
        return assets.find((item) => item.id === request.assetId && item.landlordOpenId === landlordOpenId)?.name ?? '未知房源';
    }
    return '全部房源';
}
async function listReportExports(db, landlordOpenId) {
    const records = await (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.reportExports);
    return records
        .filter((record) => record.landlordOpenId === landlordOpenId)
        .map((record) => report_export_1.reportExportMetadataSchema.parse(record))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
async function deleteReportExport(db, landlordOpenId, exportId) {
    const record = await (0, runtime_2.findById)(db, collections_1.COLLECTIONS.reportExports, exportId);
    const parsed = record ? report_export_1.reportExportMetadataSchema.parse(record) : null;
    if (!parsed || parsed.landlordOpenId !== landlordOpenId) {
        throw new Error(`Report export ${exportId} not found.`);
    }
    await (0, runtime_2.removeRecordsByQuery)(db, collections_1.COLLECTIONS.reportExports, {
        id: exportId,
        landlordOpenId
    });
    return parsed;
}
async function saveReportExportMetadata(db, landlordOpenId, request, fileName, scopeLabel, sheetNames, summary, event, fileID, exportId) {
    const now = (0, runtime_1.resolveNow)(event);
    const metadata = report_export_1.reportExportMetadataSchema.parse({
        id: exportId ?? (0, runtime_1.createId)('report_export'),
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
    await (0, runtime_1.insertRecord)(db, collections_1.COLLECTIONS.reportExports, metadata);
    return metadata;
}
