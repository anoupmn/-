"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listReceiptRecords = listReceiptRecords;
exports.createReceipt = createReceipt;
exports.getReceipt = getReceipt;
exports.deleteReceipt = deleteReceipt;
exports.listReceiptLeaseOptions = listReceiptLeaseOptions;
const collections_1 = require("../constants/collections");
const receipt_1 = require("../schemas/receipt");
const runtime_1 = require("../runtime");
function monthOf(date) {
    return String(date || '').slice(0, 7);
}
function receiptNo(now) {
    const timestamp = now.replace(/\D/g, '').slice(0, 14);
    return `R${timestamp}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}
function monthLabel(month) {
    const [year, value] = month.split('-');
    return year && value ? `${year}年${value}月` : month;
}
function isReceivedTenantBill(bill) {
    return bill.responsibility === 'tenant' && Boolean(bill.receivedAt) && bill.receivedAmount != null;
}
function itemLabel(bill) {
    if (bill.itemLabel) {
        return bill.itemLabel;
    }
    const labels = {
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
    return labels[bill.type] ?? bill.type;
}
async function listReceipts(db) {
    return (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.receipts);
}
function receiptMonthKey(receipt) {
    return String(receipt.items[0]?.dueDate ?? '').slice(0, 7);
}
function matchesLeaseMonth(receipt, leaseId, month) {
    return receipt.leaseId === leaseId && receipt.items.some((item) => monthOf(item.dueDate) === month);
}
function matchesReceiptFilters(receipt, filters) {
    const status = filters.status ?? 'all';
    if (status !== 'all' && receipt.status !== status) {
        return false;
    }
    if (filters.month && !receipt.items.some((item) => String(item.dueDate).slice(0, 7) === filters.month)) {
        return false;
    }
    if (filters.assetId && receipt.assetId !== filters.assetId) {
        return false;
    }
    if (filters.leaseId && receipt.leaseId !== filters.leaseId) {
        return false;
    }
    if (filters.roomId && receipt.roomId !== filters.roomId) {
        return false;
    }
    if (filters.tenantId && receipt.tenantId !== filters.tenantId) {
        return false;
    }
    return true;
}
function toReceiptRecord(receipt) {
    return {
        id: receipt.id,
        receiptNo: receipt.receiptNo,
        monthKey: receiptMonthKey(receipt),
        assetId: receipt.assetId,
        leaseId: receipt.leaseId,
        roomId: receipt.roomId,
        tenantId: receipt.tenantId,
        assetName: receipt.assetName,
        roomName: receipt.roomName,
        tenantName: receipt.tenantName,
        receivedAt: receipt.receivedAt,
        totalAmount: receipt.totalAmount,
        status: receipt.status,
        billCount: receipt.billIds.length,
        billIds: [...receipt.billIds],
        createdAt: receipt.createdAt,
        updatedAt: receipt.updatedAt
    };
}
async function listReceiptRecords(db, landlordOpenId, filters = {}) {
    const receipts = await listReceipts(db);
    return receipts
        .filter((receipt) => receipt.landlordOpenId === landlordOpenId)
        .filter((receipt) => matchesReceiptFilters(receipt, filters))
        .sort((left, right) => {
        const createdOrder = String(right.createdAt || '').localeCompare(String(left.createdAt || ''));
        if (createdOrder !== 0) {
            return createdOrder;
        }
        return String(right.receiptNo || '').localeCompare(String(left.receiptNo || ''));
    })
        .map(toReceiptRecord);
}
async function selectReceiptBills(db, landlordOpenId, input) {
    const bills = await (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.bills);
    const scopedBills = bills.filter((bill) => bill.landlordOpenId === landlordOpenId);
    if (input.billIds?.length) {
        const billIdSet = new Set(input.billIds);
        return scopedBills.filter((bill) => billIdSet.has(bill.id));
    }
    if (input.month && input.leaseId) {
        return scopedBills.filter((bill) => bill.leaseId === input.leaseId && monthOf(bill.dueDate) === input.month && isReceivedTenantBill(bill));
    }
    if (input.month && input.roomId) {
        return scopedBills.filter((bill) => bill.roomId === input.roomId && monthOf(bill.dueDate) === input.month && isReceivedTenantBill(bill));
    }
    throw new Error('Pass billIds or month + leaseId to create a receipt.');
}
async function createReceipt(db, landlordOpenId, input, event) {
    const receipts = await listReceipts(db);
    const activeReceipts = receipts.filter((receipt) => receipt.landlordOpenId === landlordOpenId && receipt.status === 'active');
    if (input.month && input.leaseId) {
        const existingMonthlyReceipt = activeReceipts.find((receipt) => matchesLeaseMonth(receipt, input.leaseId, input.month));
        if (existingMonthlyReceipt) {
            return existingMonthlyReceipt;
        }
    }
    const bills = await selectReceiptBills(db, landlordOpenId, input);
    if (input.billIds?.length && bills.length !== input.billIds.length) {
        throw new Error('Some bills were not found for current landlord.');
    }
    if (bills.length === 0) {
        throw new Error('No paid tenant bills can be used for receipt.');
    }
    const invalidBill = bills.find((bill) => !isReceivedTenantBill(bill));
    if (invalidBill) {
        throw new Error('Receipt can only be created from paid tenant bills.');
    }
    const activeReceiptIds = new Set(activeReceipts.map((receipt) => receipt.id));
    const activeBillIds = new Set(activeReceipts.flatMap((receipt) => receipt.billIds));
    const duplicateBill = bills.find((bill) => activeBillIds.has(bill.id) || (bill.receiptId && activeReceiptIds.has(bill.receiptId)));
    if (duplicateBill) {
        throw new Error(`Bill ${duplicateBill.id} already has an active receipt.`);
    }
    const [leases, rooms, tenants, assets] = await Promise.all([
        (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.leases),
        (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.rooms),
        (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.tenants),
        (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.assets)
    ]);
    const firstBill = bills[0];
    const lease = leases.find((item) => item.id === firstBill.leaseId && item.landlordOpenId === landlordOpenId);
    const room = rooms.find((item) => item.id === firstBill.roomId && item.landlordOpenId === landlordOpenId);
    const tenant = lease ? tenants.find((item) => item.id === lease.tenantId && item.landlordOpenId === landlordOpenId) : undefined;
    const asset = room ? assets.find((item) => item.id === room.assetId && item.landlordOpenId === landlordOpenId) : undefined;
    if (!lease || !room || !tenant || !asset) {
        throw new Error('Receipt snapshot source data is incomplete.');
    }
    const billMonth = monthOf(firstBill.dueDate);
    const invalidGroupBill = bills.find((bill) => {
        const billLease = leases.find((item) => item.id === bill.leaseId && item.landlordOpenId === landlordOpenId);
        return (bill.roomId !== firstBill.roomId ||
            bill.leaseId !== firstBill.leaseId ||
            billLease?.tenantId !== tenant.id ||
            monthOf(bill.dueDate) !== billMonth);
    });
    if (invalidGroupBill) {
        throw new Error('Receipt bills must belong to the same room, same tenant, same lease, and same bill month.');
    }
    const now = (0, runtime_1.resolveNow)(event);
    const nextReceiptNo = receiptNo(now);
    const receipt = receipt_1.receiptSchema.parse({
        id: (0, runtime_1.createId)('receipt'),
        receiptNo: nextReceiptNo,
        landlordOpenId,
        leaseId: lease.id,
        roomId: room.id,
        tenantId: tenant.id,
        assetId: asset.id,
        billIds: bills.map((bill) => bill.id),
        title: '收款收据（非发票）',
        assetName: asset.name,
        roomName: room.name,
        tenantName: tenant.name,
        items: bills.map((bill) => ({
            billId: bill.id,
            type: bill.type,
            feeNature: bill.feeNature,
            itemLabel: itemLabel(bill),
            dueDate: bill.dueDate,
            amount: bill.amount,
            receivedAt: bill.receivedAt,
            receivedAmount: bill.receivedAmount,
            note: bill.note ?? '',
            meterReading: bill.meterReading
        })),
        totalAmount: bills.reduce((sum, bill) => sum + Number(bill.receivedAmount ?? 0), 0),
        receivedAt: bills.map((bill) => bill.receivedAt).sort().slice(-1)[0],
        note: input.note ?? '',
        status: 'active',
        createdAt: now,
        updatedAt: now
    });
    await (0, runtime_1.insertRecord)(db, collections_1.COLLECTIONS.receipts, receipt);
    for (const bill of bills) {
        await (0, runtime_1.updateRecord)(db, collections_1.COLLECTIONS.bills, bill.id, {
            receiptId: receipt.id,
            receiptNo: receipt.receiptNo,
            updatedAt: now
        });
    }
    return receipt;
}
async function getReceipt(db, landlordOpenId, receiptId) {
    const receipt = await (0, runtime_1.findById)(db, collections_1.COLLECTIONS.receipts, receiptId);
    if (!receipt || receipt.landlordOpenId !== landlordOpenId) {
        throw new Error(`Receipt ${receiptId} not found.`);
    }
    return receipt;
}
async function deleteReceipt(db, landlordOpenId, receiptId, event) {
    const receipt = await (0, runtime_1.findById)(db, collections_1.COLLECTIONS.receipts, receiptId);
    if (!receipt || receipt.landlordOpenId !== landlordOpenId) {
        throw new Error(`Receipt ${receiptId} not found.`);
    }
    const now = (0, runtime_1.resolveNow)(event);
    const billIdSet = new Set(receipt.billIds);
    const bills = await (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.bills);
    const linkedBills = bills.filter((bill) => bill.landlordOpenId === landlordOpenId &&
        (bill.receiptId === receipt.id || billIdSet.has(bill.id)));
    for (const bill of linkedBills) {
        await (0, runtime_1.updateRecord)(db, collections_1.COLLECTIONS.bills, bill.id, {
            receiptId: '',
            receiptNo: '',
            updatedAt: now
        });
    }
    await (0, runtime_1.removeRecordsByQuery)(db, collections_1.COLLECTIONS.receipts, { id: receipt.id });
    return {
        deleted: true,
        deletedReceiptId: receipt.id,
        unlinkedBillCount: linkedBills.length
    };
}
async function listReceiptLeaseOptions(db, landlordOpenId) {
    const [leases, rooms, tenants, assets, bills, receipts] = await Promise.all([
        (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.leases),
        (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.rooms),
        (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.tenants),
        (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.assets),
        (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.bills),
        listReceipts(db)
    ]);
    const activeReceiptIds = new Set(receipts
        .filter((receipt) => receipt.landlordOpenId === landlordOpenId && receipt.status === 'active')
        .map((receipt) => receipt.id));
    const activeBillIds = new Set(receipts
        .filter((receipt) => receipt.landlordOpenId === landlordOpenId && receipt.status === 'active')
        .flatMap((receipt) => receipt.billIds));
    const activeLeaseMonthKeys = new Set(receipts
        .filter((receipt) => receipt.landlordOpenId === landlordOpenId && receipt.status === 'active')
        .flatMap((receipt) => receipt.items.map((item) => `${receipt.leaseId}:${monthOf(item.dueDate)}`)));
    const ownedLeases = leases.filter((lease) => lease.landlordOpenId === landlordOpenId);
    return ownedLeases
        .map((lease) => {
        const room = rooms.find((item) => item.id === lease.roomId && item.landlordOpenId === landlordOpenId);
        const asset = room ? assets.find((item) => item.id === room.assetId && item.landlordOpenId === landlordOpenId) : undefined;
        const tenant = tenants.find((item) => item.id === lease.tenantId && item.landlordOpenId === landlordOpenId);
        const receiptableBills = bills.filter((bill) => bill.landlordOpenId === landlordOpenId &&
            bill.leaseId === lease.id &&
            isReceivedTenantBill(bill) &&
            !activeLeaseMonthKeys.has(`${lease.id}:${monthOf(bill.dueDate)}`) &&
            !activeBillIds.has(bill.id) &&
            !(bill.receiptId && activeReceiptIds.has(bill.receiptId)));
        const monthMap = receiptableBills.reduce((acc, bill) => {
            const month = monthOf(bill.dueDate);
            if (!month) {
                return acc;
            }
            acc.set(month, [...(acc.get(month) ?? []), bill]);
            return acc;
        }, new Map());
        const months = Array.from(monthMap.entries())
            .map(([month, monthBills]) => ({
            month,
            monthLabel: monthLabel(month),
            billCount: monthBills.length,
            totalAmount: monthBills.reduce((sum, bill) => sum + Number(bill.receivedAmount ?? 0), 0),
            latestReceivedAt: monthBills.map((bill) => String(bill.receivedAt || '')).sort().slice(-1)[0] || ''
        }))
            .sort((left, right) => right.month.localeCompare(left.month));
        return {
            leaseId: lease.id,
            assetId: asset?.id ?? '',
            roomId: room?.id ?? lease.roomId,
            tenantId: tenant?.id ?? lease.tenantId,
            assetName: asset?.name ?? '未知房源',
            roomName: room?.name ?? '未知房间',
            tenantName: tenant?.name ?? '未知租客',
            startDate: lease.startDate,
            endDate: lease.endDate,
            label: `${asset?.name ?? '未知房源'} / ${room?.name ?? '未知房间'} / ${tenant?.name ?? '未知租客'}（${lease.startDate} 至 ${lease.endDate}）`,
            months
        };
    })
        .filter((option) => option.months.length > 0)
        .sort((left, right) => right.startDate.localeCompare(left.startDate) || left.label.localeCompare(right.label));
}
