"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateMeterBill = calculateMeterBill;
exports.listBillsByLease = listBillsByLease;
exports.listOutstandingBillsByRoom = listOutstandingBillsByRoom;
exports.isReplaceableSystemBill = isReplaceableSystemBill;
exports.syncBillsForLease = syncBillsForLease;
exports.ensureBillsForLease = ensureBillsForLease;
exports.markBillReceived = markBillReceived;
exports.createManualBill = createManualBill;
exports.createMeterBill = createMeterBill;
exports.resolveMeterDefaults = resolveMeterDefaults;
const dayjs_1 = __importDefault(require("dayjs"));
const collections_1 = require("../constants/collections");
const statuses_1 = require("../constants/statuses");
const bill_status_1 = require("../calculators/bill-status");
const bill_1 = require("../schemas/bill");
const lease_1 = require("../schemas/lease");
const runtime_1 = require("../runtime");
const LANDLORD_EXPENSE_LABEL_PATTERN = /维修|保洁|打理|请人|管理支出|房东支出/u;
function resolveFeeNatureFromCadence(cadence) {
    return cadence === 'once' ? 'one_time' : 'recurring';
}
function isUtilityBillType(type) {
    return type === 'water' || type === 'electricity';
}
function calculateMeterBill(input) {
    const previousReading = Number(input.previousReading);
    const currentReading = Number(input.currentReading);
    const unitPrice = Number(input.unitPrice);
    if (![previousReading, currentReading, unitPrice].every(Number.isFinite)) {
        throw new Error('previousReading, currentReading and unitPrice must be valid numbers.');
    }
    if (previousReading < 0 || currentReading < 0 || unitPrice < 0) {
        throw new Error('previousReading, currentReading and unitPrice must be non-negative.');
    }
    if (currentReading < previousReading) {
        throw new Error('currentReading must be greater than or equal to previousReading.');
    }
    const usage = currentReading - previousReading;
    const amount = Math.round(usage * unitPrice * 100) / 100;
    return {
        amount,
        meterReading: {
            previousReading,
            currentReading,
            usage,
            unitPrice
        }
    };
}
function buildRecurringDueDates(lease) {
    const dueDates = [];
    let current = (0, dayjs_1.default)(lease.startDate);
    const endDate = (0, dayjs_1.default)(lease.endDate);
    while (!current.isAfter(endDate, 'day')) {
        dueDates.push(current.format('YYYY-MM-DD'));
        current = current.add(lease.billingCycleDays, 'day');
    }
    return dueDates;
}
function mapLeaseFeeItems(lease) {
    const feeRules = (0, lease_1.getLeaseFeeRules)(lease);
    const items = [
        {
            type: 'rent',
            section: 'rent',
            amount: feeRules.rent.amount,
            cadence: feeRules.rent.cadence,
            feeNature: 'recurring',
            isDepositLike: false
        }
    ];
    if (feeRules.deposit.amount > 0) {
        items.push({
            type: 'deposit',
            section: 'deposit',
            amount: feeRules.deposit.amount,
            cadence: feeRules.deposit.cadence,
            feeNature: 'deposit',
            isDepositLike: true
        });
    }
    if (feeRules.management.amount > 0) {
        items.push({
            type: 'management',
            section: 'non_rent',
            amount: feeRules.management.amount,
            cadence: feeRules.management.cadence,
            feeNature: resolveFeeNatureFromCadence(feeRules.management.cadence),
            isDepositLike: false
        });
    }
    if (feeRules.fireDeposit.amount > 0) {
        items.push({
            type: 'fire_deposit',
            section: 'deposit',
            amount: feeRules.fireDeposit.amount,
            cadence: 'once',
            feeNature: 'deposit',
            isDepositLike: true
        });
    }
    if (feeRules.lockCardDeposit.amount > 0) {
        items.push({
            type: 'lock_card_deposit',
            section: 'deposit',
            amount: feeRules.lockCardDeposit.amount,
            cadence: 'once',
            feeNature: 'deposit',
            isDepositLike: true
        });
    }
    const optionalRuleEntries = [
        { type: 'water', rule: feeRules.water },
        { type: 'electricity', rule: feeRules.electricity },
        { type: 'property', rule: feeRules.property, legacy: true },
        { type: 'misc', rule: feeRules.misc }
    ];
    optionalRuleEntries.forEach(({ type, rule, legacy }) => {
        if (!rule || rule.amount <= 0) {
            return;
        }
        items.push({
            type,
            section: 'non_rent',
            amount: rule.amount,
            cadence: rule.cadence,
            feeNature: resolveFeeNatureFromCadence(rule.cadence),
            isDepositLike: false,
            legacy
        });
    });
    feeRules.customFeeItems.forEach((item) => {
        if (item.amount <= 0) {
            return;
        }
        items.push({
            type: 'custom',
            section: item.feeNature === 'deposit' ? 'deposit' : 'non_rent',
            amount: item.amount,
            cadence: item.cadence,
            feeNature: item.feeNature,
            isDepositLike: item.feeNature === 'deposit',
            itemKey: item.key,
            itemLabel: item.label
        });
    });
    return items;
}
function buildBillsForLease(lease, event) {
    const generatedAt = (0, runtime_1.resolveNow)(event);
    const recurringDueDates = buildRecurringDueDates(lease);
    const feeItems = mapLeaseFeeItems(lease);
    return feeItems.flatMap((item) => {
        const dueDates = item.cadence === 'once' ? [lease.startDate] : recurringDueDates;
        return dueDates.map((dueDate) => {
            const parsed = bill_1.billSchema.parse({
                id: (0, runtime_1.createId)('bill'),
                landlordOpenId: lease.landlordOpenId,
                leaseId: lease.id,
                roomId: lease.roomId,
                type: item.type,
                section: item.section,
                dueDate,
                amount: item.amount,
                status: statuses_1.BILL_STATUSES.pending,
                receivedAt: null,
                receivedAmount: null,
                note: '',
                itemKey: item.itemKey,
                itemLabel: item.itemLabel,
                source: 'system',
                feeNature: item.feeNature,
                responsibility: 'tenant',
                cadence: item.cadence,
                isDepositLike: item.isDepositLike,
                isOneTime: item.cadence === 'once',
                legacy: item.legacy ?? false,
                createdAt: generatedAt,
                updatedAt: generatedAt
            });
            return {
                ...parsed,
                status: (0, bill_status_1.deriveBillStatus)(parsed, generatedAt)
            };
        });
    });
}
async function listBillsByLease(db, leaseId) {
    const bills = await (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.bills);
    return bills
        .filter((bill) => bill.leaseId === leaseId)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}
async function listOutstandingBillsByRoom(db, roomId, now) {
    const bills = await (0, runtime_1.listAll)(db, collections_1.COLLECTIONS.bills);
    return bills
        .filter((bill) => bill.roomId === roomId)
        .map((bill) => ({
        ...bill,
        status: (0, bill_status_1.deriveBillStatus)(bill, now)
    }))
        .filter((bill) => bill.status !== statuses_1.BILL_STATUSES.paid)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}
function isReplaceableSystemBill(bill) {
    return ((bill.source ?? 'system') === 'system' &&
        !bill.receivedAt &&
        bill.receivedAmount === null &&
        !bill.receiptId &&
        !bill.voidedAt);
}
async function syncBillsForLease(db, lease, event) {
    const existingBills = await listBillsByLease(db, lease.id);
    const replaceableBills = existingBills.filter(isReplaceableSystemBill);
    for (const bill of replaceableBills) {
        await db.collection(collections_1.COLLECTIONS.bills).where({ id: bill.id }).remove();
    }
    const bills = buildBillsForLease(lease, event);
    for (const bill of bills) {
        await (0, runtime_1.insertRecord)(db, collections_1.COLLECTIONS.bills, bill);
    }
    return bills;
}
async function ensureBillsForLease(db, lease, event) {
    const existingBills = await listBillsByLease(db, lease.id);
    if (existingBills.length > 0) {
        return existingBills;
    }
    return syncBillsForLease(db, lease, event);
}
async function markBillReceived(db, input, event) {
    const bill = await (0, runtime_1.findById)(db, collections_1.COLLECTIONS.bills, input.billId);
    if (!bill) {
        throw new Error(`Bill ${input.billId} not found.`);
    }
    if (input.receivedAmount <= 0) {
        throw new Error('receivedAmount must be greater than 0.');
    }
    return (0, runtime_1.updateRecord)(db, collections_1.COLLECTIONS.bills, input.billId, {
        receivedAt: input.receivedAt,
        receivedAmount: input.receivedAmount,
        status: statuses_1.BILL_STATUSES.paid,
        updatedAt: (0, runtime_1.resolveNow)(event)
    });
}
async function createManualBill(db, input, event) {
    if (isUtilityBillType(input.type)) {
        throw new Error('Utility bills must be created from meter readings.');
    }
    if (LANDLORD_EXPENSE_LABEL_PATTERN.test(String(input.itemLabel || ''))) {
        throw new Error('Landlord expenses must not be recorded as tenant bills.');
    }
    if (input.amount <= 0) {
        throw new Error('amount must be greater than 0.');
    }
    const createdAt = (0, runtime_1.resolveNow)(event);
    const parsed = bill_1.billSchema.parse({
        id: (0, runtime_1.createId)('bill'),
        landlordOpenId: input.lease.landlordOpenId,
        leaseId: input.lease.id,
        roomId: input.lease.roomId,
        type: input.type,
        section: input.section,
        dueDate: input.dueDate,
        amount: input.amount,
        status: statuses_1.BILL_STATUSES.pending,
        receivedAt: null,
        receivedAmount: null,
        note: input.note ?? '',
        itemKey: input.type === 'custom' ? `manual_${Date.now()}` : undefined,
        itemLabel: input.itemLabel,
        source: 'manual',
        feeNature: 'one_time',
        responsibility: 'tenant',
        cadence: 'once',
        isDepositLike: false,
        isOneTime: true,
        createdAt,
        updatedAt: createdAt
    });
    const bill = {
        ...parsed,
        status: (0, bill_status_1.deriveBillStatus)(parsed, createdAt)
    };
    await (0, runtime_1.insertRecord)(db, collections_1.COLLECTIONS.bills, bill);
    return bill;
}
async function createMeterBill(db, input, event) {
    const { amount, meterReading } = calculateMeterBill(input);
    const createdAt = (0, runtime_1.resolveNow)(event);
    const parsed = bill_1.billSchema.parse({
        id: (0, runtime_1.createId)('bill'),
        landlordOpenId: input.lease.landlordOpenId,
        leaseId: input.lease.id,
        roomId: input.lease.roomId,
        type: input.type,
        section: 'non_rent',
        dueDate: input.dueDate,
        amount,
        status: statuses_1.BILL_STATUSES.pending,
        receivedAt: null,
        receivedAmount: null,
        note: input.note ?? '',
        itemKey: input.type,
        itemLabel: input.type === 'water' ? '水费' : '电费',
        source: 'manual',
        meterReading,
        feeNature: 'one_time',
        responsibility: 'tenant',
        cadence: 'once',
        isDepositLike: false,
        isOneTime: true,
        createdAt,
        updatedAt: createdAt
    });
    const bill = {
        ...parsed,
        status: (0, bill_status_1.deriveBillStatus)(parsed, createdAt)
    };
    await (0, runtime_1.insertRecord)(db, collections_1.COLLECTIONS.bills, bill);
    return bill;
}
function resolveMeterDefaults(bills, roomId) {
    const latestByType = (type) => bills
        .filter((bill) => bill.roomId === roomId && bill.type === type && bill.meterReading)
        .sort((a, b) => b.dueDate.localeCompare(a.dueDate) || b.updatedAt.localeCompare(a.updatedAt))[0];
    const toDefault = (bill) => {
        const meterReading = bill?.meterReading;
        if (!meterReading) {
            return null;
        }
        return {
            previousReading: meterReading.currentReading,
            unitPrice: meterReading.unitPrice
        };
    };
    return {
        water: toDefault(latestByType('water')),
        electricity: toDefault(latestByType('electricity'))
    };
}
