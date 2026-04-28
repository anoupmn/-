"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lease_1 = require("../../services/lease");
const bill_1 = require("../../services/bill");
const owner_expense_1 = require("../../services/owner-expense");
const rentable_unit_1 = require("../../services/rentable-unit");
function formatStatusLabel(status) {
    const mapping = {
        pending: '待收',
        due_today: '今日到期',
        paid: '已收',
        overdue: '逾期'
    };
    return mapping[status] ?? status;
}
function formatDateLabel(date) {
    const matched = String(date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!matched) {
        return date || '';
    }
    return `${matched[1]}年${matched[2]}月${matched[3]}日`;
}
function formatPeriodLabel(startDate, endDate) {
    return `${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}`;
}
function normalizeClosedDate(raw) {
    const source = String(raw || '').trim();
    if (!source) {
        return '';
    }
    const matched = source.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
    if (!matched) {
        return '';
    }
    return `${matched[1]}-${matched[2]}-${matched[3]}`;
}
function hasOutstandingActiveBills(detail) {
    const monthlyBillGroups = Array.isArray(detail?.monthlyBillGroups) ? detail.monthlyBillGroups : [];
    return monthlyBillGroups.some((group) => Array.isArray(group.items) &&
        group.items.some((item) => String(item.status || '').toLowerCase() !== 'paid'));
}
function getLocalDateKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
function shouldPromptExpiryEndLease(detail) {
    const activeLease = detail?.activeLease;
    if (!activeLease?.id) {
        return false;
    }
    const contractEndDate = String(activeLease.endDate || '').slice(0, 10);
    if (!contractEndDate) {
        return false;
    }
    const todayDate = getLocalDateKey();
    if (todayDate < contractEndDate) {
        return false;
    }
    return !hasOutstandingActiveBills(detail);
}
function resolveBillActionErrorMessage(error) {
    const payload = error;
    const rawMessage = `${payload?.message ?? ''} ${payload?.errMsg ?? ''}`.toLowerCase();
    if (rawMessage.includes('functionname parameter could not be found') || rawMessage.includes('function not found')) {
        return '云函数未部署，请先上传账单相关函数';
    }
    if (rawMessage.includes('missing openid')) {
        return '登录状态已失效，请重新登录';
    }
    if (rawMessage.includes('bill') && rawMessage.includes('not found')) {
        return '账单不存在或无权限，请刷新后重试';
    }
    if (rawMessage.includes('timeout')) {
        return '请求超时，请稍后重试';
    }
    return '保存失败，请稍后再试';
}
function resolveRepairSaveErrorMessage(error) {
    const payload = error;
    const rawMessage = `${payload?.message ?? ''} ${payload?.errMsg ?? ''}`.toLowerCase();
    if (rawMessage.includes('missing openid')) {
        return '登录状态已失效，请重新登录';
    }
    if (rawMessage.includes('room') && rawMessage.includes('not found')) {
        return '当前房间与登录账号不匹配，请刷新后重试';
    }
    if (rawMessage.includes('asset') && rawMessage.includes('not found')) {
        return '房源不存在或无权限，无法保存维修记录';
    }
    if (rawMessage.includes('assetid or roomid is required')) {
        return '缺少房间信息，请返回后重试';
    }
    if (rawMessage.includes('invalid repair category')) {
        return '维修分类无效，请重新选择';
    }
    if (rawMessage.includes('timeout')) {
        return '请求超时，请稍后重试';
    }
    return '维修记录保存失败，请稍后重试';
}
function resolveLeaseSaveErrorMessage(error) {
    const payload = error;
    const rawMessage = `${payload?.message ?? ''} ${payload?.errMsg ?? ''}`.trim();
    if (!rawMessage) {
        return '续租失败，请稍后重试';
    }
    if (rawMessage.includes('租约开始日期不能晚于结束日期')) {
        return '续租日期异常：开始日期不能晚于结束日期';
    }
    if (rawMessage.includes('租约时间冲突')) {
        const matched = rawMessage.match(/租约时间冲突[^。]*。?/);
        return matched?.[0] ?? '续租失败：新租期与现有租约冲突';
    }
    if (rawMessage.includes('租约日期不完整')) {
        return '续租失败：租约日期不完整';
    }
    if (rawMessage.toLowerCase().includes('tenant') && rawMessage.toLowerCase().includes('not found')) {
        return '续租失败：租户信息不存在，请刷新后重试';
    }
    return '续租失败，请稍后重试';
}
function resolveRenewBaseLease(detail) {
    if (!detail) {
        return null;
    }
    if (detail.activeLease?.id) {
        return detail.activeLease;
    }
    const leaseHistory = Array.isArray(detail.leaseHistory) ? detail.leaseHistory : [];
    if (!leaseHistory.length) {
        return null;
    }
    return leaseHistory[0];
}
function resolveRenewBaseLeaseById(detail, leaseId) {
    if (!detail || !leaseId) {
        return null;
    }
    if (String(detail.activeLease?.id || '') === leaseId) {
        return detail.activeLease;
    }
    const leaseHistory = Array.isArray(detail.leaseHistory) ? detail.leaseHistory : [];
    return leaseHistory.find((lease) => String(lease.id || '') === leaseId) ?? null;
}
function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
function addDays(dateKey, days) {
    const date = new Date(`${dateKey}T00:00:00`);
    date.setDate(date.getDate() + days);
    return formatDateKey(date);
}
function addMonthsInclusive(startDate, months) {
    const date = new Date(`${startDate}T00:00:00`);
    date.setMonth(date.getMonth() + months);
    date.setDate(date.getDate() - 1);
    return formatDateKey(date);
}
function resolveRenewFeeRules(baseLease) {
    const feeRules = baseLease.feeRules ?? {};
    const rentAmount = Number(feeRules.rent?.amount ?? baseLease.rentAmount ?? 0);
    const managementAmount = Number(feeRules.management?.amount ?? 0);
    const managementCadence = feeRules.management?.cadence === 'once' ? 'once' : 'cycle';
    const customFeeItems = Array.isArray(feeRules.customFeeItems)
        ? feeRules.customFeeItems
            .filter((item) => item?.feeNature === 'recurring' &&
            item?.cadence !== 'once' &&
            Number(item.amount || 0) > 0)
            .map((item, index) => ({
            key: String(item.key || `renew_custom_${index + 1}`),
            label: String(item.label || '自定义费用'),
            amount: Number(item.amount || 0),
            cadence: 'cycle',
            feeNature: 'recurring'
        }))
        : [];
    return {
        rentAmount,
        feeRules: {
            rent: {
                amount: rentAmount,
                cadence: 'cycle'
            },
            deposit: {
                amount: 0,
                cadence: 'once'
            },
            management: managementAmount > 0 && managementCadence === 'cycle'
                ? { amount: managementAmount, cadence: 'cycle' }
                : undefined,
            customFeeItems
        }
    };
}
function buildLeaseHistoryViews(detail) {
    const leaseHistory = Array.isArray(detail.leaseHistory) ? detail.leaseHistory : [];
    const tenantHistory = Array.isArray(detail.tenantHistory) ? detail.tenantHistory : [];
    const repairHistory = Array.isArray(detail.repairHistory) ? detail.repairHistory : [];
    const tenantPeriodRepairs = Array.isArray(detail.tenantPeriodRepairs) ? detail.tenantPeriodRepairs : [];
    const activeLeaseId = String(detail.activeLease?.id || '');
    const tenantPhoneMap = tenantHistory.reduce((acc, tenant) => {
        const phone = String(tenant.phone || '');
        const businessId = String(tenant.id || '').trim();
        const legacyDocId = String(tenant._id || '').trim();
        if (businessId) {
            acc.set(businessId, phone);
        }
        if (legacyDocId) {
            acc.set(legacyDocId, phone);
        }
        return acc;
    }, new Map());
    const perLeaseCountMap = new Map(tenantPeriodRepairs.map((item) => [String(item.leaseId || ''), Number(item.count || 0)]));
    return leaseHistory
        .filter((lease) => String(lease.id || '') !== activeLeaseId)
        .map((lease) => {
        const leaseId = String(lease.id || '');
        const startDate = String(lease.startDate || '');
        const originalEndDate = String(lease.originalEndDate || lease.endDate || '');
        const closedDate = normalizeClosedDate(lease.closedAt);
        const actualEndDate = String(lease.actualEndDate || closedDate || lease.endDate || '');
        const inferredEarlyTermination = Boolean(actualEndDate && originalEndDate && actualEndDate < originalEndDate);
        const terminationRemark = String(lease.terminationRemark || '')
            || (inferredEarlyTermination ? '提前结束租约' : '');
        const repairs = repairHistory
            .filter((repair) => String(repair.leaseId || '') === leaseId)
            .map((repair) => ({
            id: String(repair.id || `${leaseId}-${repair.occurredAt || ''}-${repair.note || ''}`),
            occurredAt: String(repair.occurredAt || ''),
            categoryLabel: String(repair.categoryLabel || '维修'),
            note: String(repair.note || '')
        }));
        return {
            leaseId,
            tenantName: String(lease.tenantName || '未知租户'),
            tenantPhone: tenantPhoneMap.get(String(lease.tenantId || '')) || '',
            startDate,
            endDate: actualEndDate,
            originalPeriodLabel: String(lease.originalPeriodLabel || formatPeriodLabel(startDate, originalEndDate)),
            actualPeriodLabel: String(lease.actualPeriodLabel || formatPeriodLabel(startDate, actualEndDate)),
            terminationRemark,
            repairCount: perLeaseCountMap.get(leaseId) ?? repairs.length,
            repairs
        };
    })
        .sort((a, b) => b.endDate.localeCompare(a.endDate) || b.startDate.localeCompare(a.startDate));
}
function buildYearlyBillGroups(monthlyBillGroups) {
    const currentYear = String(new Date().getFullYear());
    const yearMap = monthlyBillGroups.reduce((acc, group) => {
        const yearKey = String(group.monthKey || '').slice(0, 4);
        if (!yearKey) {
            return acc;
        }
        if (!acc.has(yearKey)) {
            acc.set(yearKey, {
                yearKey,
                yearLabel: `${yearKey}年`,
                expandedByDefault: yearKey === currentYear,
                months: []
            });
        }
        acc.get(yearKey)?.months.push(group);
        return acc;
    }, new Map());
    const yearGroups = Array.from(yearMap.values())
        .map((group) => ({
        ...group,
        months: group.months.sort((a, b) => a.monthKey.localeCompare(b.monthKey))
    }))
        .sort((a, b) => b.yearKey.localeCompare(a.yearKey));
    if (yearGroups.length && !yearGroups.some((group) => group.expandedByDefault)) {
        yearGroups[0] = {
            ...yearGroups[0],
            expandedByDefault: true
        };
    }
    return yearGroups;
}
const MANUAL_BILL_TYPE_KEYS = ['water', 'electricity', 'custom'];
const MANUAL_BILL_TYPE_LABELS = ['水费', '电费', '其他费用'];
const REPAIR_CATEGORY_OPTIONS = [
    { key: 'plumbing', label: '水路' },
    { key: 'electrical', label: '电路' },
    { key: 'appliance', label: '家电' },
    { key: 'structure', label: '结构' },
    { key: 'safety', label: '安全' },
    { key: 'other', label: '其他' }
];
const OWNER_EXPENSE_TYPE_OPTIONS = [
    { key: 'repair', label: '维修' },
    { key: 'cleaning', label: '保洁' },
    { key: 'caretaking', label: '打理' },
    { key: 'labor', label: '请人管理' },
    { key: 'other', label: '其他支出' }
];
function buildManualBillMeta(typeIndex, currentLabel = '') {
    if (MANUAL_BILL_TYPE_KEYS[typeIndex] === 'custom') {
        return {
            showLabelInput: true,
            labelPlaceholder: '请输入费用名称',
            itemLabel: currentLabel
        };
    }
    return {
        showLabelInput: false,
        labelPlaceholder: '',
        itemLabel: ''
    };
}
function isUtilityBillType(type) {
    return type === 'water' || type === 'electricity';
}
function formatNumberInput(value) {
    if (value === null || value === undefined || value === '') {
        return '';
    }
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? String(numeric) : '';
}
Page({
    data: {
        roomId: '',
        detail: null,
        leaseHistoryViews: [],
        expandedLeaseHistory: {},
        expandedYears: {},
        expandedMonths: {},
        paymentDialogVisible: false,
        paymentSubmitting: false,
        paymentForm: {
            billId: '',
            title: '',
            amount: '',
            dueDate: ''
        },
        manualBillTypeOptions: MANUAL_BILL_TYPE_LABELS,
        manualBillDialogVisible: false,
        manualBillSubmitting: false,
        deletingBillId: '',
        repairCategoryOptions: REPAIR_CATEGORY_OPTIONS.map((item) => item.label),
        ownerExpenseTypeOptions: OWNER_EXPENSE_TYPE_OPTIONS.map((item) => item.label),
        repairDialogVisible: false,
        renewingLease: false,
        manualBillMeta: {
            showLabelInput: false,
            labelPlaceholder: ''
        },
        manualBillForm: {
            monthKey: '',
            monthLabel: '',
            typeIndex: 0,
            itemLabel: '',
            amount: '',
            previousReading: '',
            currentReading: '',
            unitPrice: '',
            note: ''
        },
        repairForm: {
            expenseTypeIndex: 0,
            categoryIndex: 0,
            note: '',
            occurredAt: '',
            amount: ''
        },
        canRenewLease: false
    },
    async loadDetail(roomId) {
        const nextRoomId = roomId ?? this.data.roomId;
        const detail = (await (0, rentable_unit_1.getRentableUnitDetail)({ roomId: nextRoomId }));
        const monthlyBillGroups = (detail.monthlyBillGroups ?? []).map((group) => ({
            ...group,
            items: group.items.map((item) => ({
                ...item,
                source: (item.source === 'manual' ? 'manual' : 'system'),
                isManual: item.source === 'manual',
                isReceivedAmountMismatch: item.isReceivedAmountMismatch === true
                    || (item.receivedAmount != null && Math.abs(Number(item.receivedAmount) - Number(item.amount || 0)) >= 0.01),
                statusLabel: formatStatusLabel(item.status)
            }))
        }));
        const leaseHistoryViews = buildLeaseHistoryViews(detail);
        const previousExpandedState = this.data.expandedLeaseHistory ?? {};
        let hasExpandedItem = false;
        const expandedLeaseHistory = leaseHistoryViews.reduce((acc, item) => {
            const expanded = Boolean(previousExpandedState[item.leaseId]);
            if (expanded) {
                hasExpandedItem = true;
            }
            acc[item.leaseId] = expanded;
            return acc;
        }, {});
        if (!hasExpandedItem && leaseHistoryViews.length) {
            expandedLeaseHistory[leaseHistoryViews[0].leaseId] = true;
        }
        const yearBillGroups = buildYearlyBillGroups(monthlyBillGroups);
        const expandedYears = yearBillGroups.reduce((acc, group) => {
            acc[group.yearKey] = group.expandedByDefault;
            return acc;
        }, {});
        const expandedMonths = monthlyBillGroups.reduce((acc, group) => {
            acc[group.monthKey] = group.expandedByDefault;
            return acc;
        }, {});
        const renewBaseLease = resolveRenewBaseLease(detail);
        this.setData({
            roomId: nextRoomId,
            detail: {
                ...detail,
                monthlyBillGroups,
                yearBillGroups,
                ownerExpenseSummary: detail.ownerExpenseSummary ?? { count: 0, totalAmount: 0, amountByType: {} },
                ownerExpenses: Array.isArray(detail.ownerExpenses) ? detail.ownerExpenses : []
            },
            leaseHistoryViews,
            expandedLeaseHistory,
            expandedYears,
            expandedMonths,
            canRenewLease: Boolean(renewBaseLease?.id)
        });
    },
    async onLoad(query) {
        const roomId = query.roomId;
        try {
            await this.loadDetail(roomId);
        }
        catch (error) {
            console.error('load unit detail on page init failed', error);
            wx.showToast({
                title: '页面加载失败，请返回重试',
                icon: 'none'
            });
        }
    },
    toggleLeaseHistoryItem(event) {
        const leaseId = String(event.currentTarget.dataset.leaseId || '');
        if (!leaseId) {
            return;
        }
        const nextExpanded = !this.data.expandedLeaseHistory[leaseId];
        const resetState = Object.keys(this.data.expandedLeaseHistory).reduce((acc, id) => {
            acc[id] = false;
            return acc;
        }, {});
        if (nextExpanded) {
            resetState[leaseId] = true;
        }
        this.setData({
            expandedLeaseHistory: resetState
        });
    },
    toggleMonth(event) {
        const monthKey = event.currentTarget.dataset.monthKey;
        if (!monthKey) {
            return;
        }
        const nextExpanded = !this.data.expandedMonths[monthKey];
        const expandedMonths = Object.keys(this.data.expandedMonths).reduce((acc, key) => {
            acc[key] = false;
            return acc;
        }, {});
        this.setData({
            expandedMonths: {
                ...expandedMonths,
                [monthKey]: nextExpanded
            }
        });
    },
    toggleYear(event) {
        const yearKey = String(event.currentTarget.dataset.yearKey || '');
        if (!yearKey) {
            return;
        }
        this.setData({
            expandedYears: {
                ...this.data.expandedYears,
                [yearKey]: !this.data.expandedYears[yearKey]
            }
        });
    },
    openPaymentDialog(event) {
        const billId = event.currentTarget.dataset.billId;
        const amount = String(event.currentTarget.dataset.amount ?? '');
        const title = event.currentTarget.dataset.title;
        const dueDate = event.currentTarget.dataset.dueDate;
        if (!billId) {
            return;
        }
        this.setData({
            paymentDialogVisible: true,
            paymentForm: {
                billId,
                title,
                amount,
                dueDate
            }
        });
    },
    closePaymentDialog() {
        this.setData({
            paymentDialogVisible: false
        });
    },
    handlePaymentAmountChange(event) {
        this.setData({
            paymentForm: {
                ...this.data.paymentForm,
                amount: event.detail.value
            }
        });
    },
    async confirmPayment() {
        if (this.data.paymentSubmitting) {
            return;
        }
        const billId = this.data.paymentForm.billId;
        const receivedAmount = Number(this.data.paymentForm.amount || 0);
        if (!billId || !receivedAmount) {
            wx.showToast({
                title: '请填写有效金额',
                icon: 'none'
            });
            return;
        }
        this.setData({
            paymentSubmitting: true
        });
        try {
            await (0, bill_1.receiveBill)({
                billId,
                receivedAt: new Date().toISOString(),
                receivedAmount
            });
            this.setData({
                paymentDialogVisible: false
            });
            wx.showToast({
                title: '已登记收款',
                icon: 'success'
            });
            await this.loadDetail();
            if (!shouldPromptExpiryEndLease(this.data.detail)) {
                return;
            }
            const latestLeaseId = String(this.data.detail?.activeLease?.id || '');
            if (!latestLeaseId) {
                return;
            }
            const confirmation = await wx.showModal({
                title: '期满结束租约',
                content: '最后一期已登记收款，且租约已到期。是否立即按“期满结束租约”处理？'
            });
            if (!confirmation.confirm) {
                return;
            }
            const closeResult = await this.endLeaseWithRetry(latestLeaseId);
            if (!closeResult.success) {
                wx.showToast({
                    title: closeResult.isTimeout ? '请求超时，请稍后重试' : '期满结束失败，请稍后重试',
                    icon: 'none'
                });
                return;
            }
            wx.showToast({
                title: '租约已期满结束',
                icon: 'success'
            });
        }
        catch (error) {
            console.error('confirm payment failed', error);
            wx.showToast({
                title: resolveBillActionErrorMessage(error),
                icon: 'none'
            });
        }
        finally {
            this.setData({
                paymentSubmitting: false
            });
        }
    },
    openManualBillDialog(event) {
        const monthKey = event.currentTarget.dataset.monthKey;
        const monthLabel = event.currentTarget.dataset.monthLabel;
        if (!monthKey) {
            return;
        }
        const meta = buildManualBillMeta(0);
        const meterDefault = this.data.detail?.meterDefaults?.water ?? null;
        this.setData({
            manualBillDialogVisible: true,
            manualBillMeta: {
                showLabelInput: meta.showLabelInput,
                labelPlaceholder: meta.labelPlaceholder
            },
            manualBillForm: {
                monthKey,
                monthLabel,
                typeIndex: 0,
                itemLabel: meta.itemLabel,
                amount: '',
                previousReading: formatNumberInput(meterDefault?.previousReading),
                currentReading: '',
                unitPrice: formatNumberInput(meterDefault?.unitPrice),
                note: ''
            }
        });
    },
    closeManualBillDialog() {
        this.setData({
            manualBillDialogVisible: false
        });
    },
    handleManualBillTypeChange(event) {
        const typeIndex = Number(event.detail.value || 0);
        const meta = buildManualBillMeta(typeIndex);
        const selectedType = MANUAL_BILL_TYPE_KEYS[typeIndex] ?? 'water';
        const meterDefault = isUtilityBillType(selectedType)
            ? this.data.detail?.meterDefaults?.[selectedType] ?? null
            : null;
        this.setData({
            manualBillMeta: {
                showLabelInput: meta.showLabelInput,
                labelPlaceholder: meta.labelPlaceholder
            },
            manualBillForm: {
                ...this.data.manualBillForm,
                typeIndex,
                itemLabel: meta.itemLabel,
                amount: isUtilityBillType(selectedType) ? '' : this.data.manualBillForm.amount,
                previousReading: formatNumberInput(meterDefault?.previousReading),
                currentReading: '',
                unitPrice: formatNumberInput(meterDefault?.unitPrice)
            }
        });
    },
    handleManualBillInputChange(event) {
        const field = event.currentTarget.dataset.field;
        this.setData({
            manualBillForm: {
                ...this.data.manualBillForm,
                [field]: event.detail.value
            }
        });
    },
    async confirmManualBill() {
        if (this.data.manualBillSubmitting) {
            return;
        }
        const leaseId = this.data.detail?.activeLease?.id;
        const { monthKey, typeIndex, itemLabel, amount, previousReading, currentReading, unitPrice, note } = this.data.manualBillForm;
        const numericAmount = Number(amount || 0);
        const selectedType = MANUAL_BILL_TYPE_KEYS[typeIndex] ?? 'water';
        if (!leaseId || !monthKey) {
            wx.showToast({
                title: '当前租约不存在',
                icon: 'none'
            });
            return;
        }
        const trimmedLabel = String(itemLabel || '').trim();
        if (selectedType === 'custom' && !trimmedLabel) {
            wx.showToast({
                title: '请填写费用名称',
                icon: 'none'
            });
            return;
        }
        if (selectedType === 'custom' && !numericAmount) {
            wx.showToast({
                title: '请填写有效金额',
                icon: 'none'
            });
            return;
        }
        const previousReadingValue = Number(previousReading);
        const currentReadingValue = Number(currentReading);
        const unitPriceValue = Number(unitPrice);
        if (isUtilityBillType(selectedType)) {
            if (![previousReadingValue, currentReadingValue, unitPriceValue].every(Number.isFinite)) {
                wx.showToast({
                    title: '请填写水电读数和单价',
                    icon: 'none'
                });
                return;
            }
            if (previousReadingValue < 0 || currentReadingValue < 0 || unitPriceValue < 0) {
                wx.showToast({
                    title: '读数和单价不能为负',
                    icon: 'none'
                });
                return;
            }
            if (currentReadingValue < previousReadingValue) {
                wx.showToast({
                    title: '本期读数不能小于上期读数',
                    icon: 'none'
                });
                return;
            }
        }
        this.setData({
            manualBillSubmitting: true
        });
        try {
            if (isUtilityBillType(selectedType)) {
                await (0, bill_1.saveBill)({
                    leaseId,
                    monthKey,
                    type: selectedType,
                    previousReading: previousReadingValue,
                    currentReading: currentReadingValue,
                    unitPrice: unitPriceValue,
                    note: String(note || '').trim()
                });
            }
            else {
                await (0, bill_1.saveBill)({
                    leaseId,
                    monthKey,
                    type: 'custom',
                    amount: numericAmount,
                    itemLabel: trimmedLabel,
                    note: String(note || '').trim()
                });
            }
            this.setData({
                manualBillDialogVisible: false
            });
            wx.showToast({
                title: '费用已补录',
                icon: 'success'
            });
            await this.loadDetail();
        }
        catch (error) {
            console.error('save manual bill failed', error);
            wx.showToast({
                title: resolveBillActionErrorMessage(error),
                icon: 'none'
            });
        }
        finally {
            this.setData({
                manualBillSubmitting: false
            });
        }
    },
    async handleDeleteManualBill(event) {
        const billId = String(event.currentTarget.dataset.billId || '');
        if (!billId || this.data.deletingBillId) {
            return;
        }
        const confirmation = await wx.showModal({
            title: '删除补录费用',
            content: '确认删除这条补录费用记录？删除后不可恢复。'
        });
        if (!confirmation.confirm) {
            return;
        }
        this.setData({
            deletingBillId: billId
        });
        try {
            await (0, bill_1.deleteBill)({ billId });
            wx.showToast({
                title: '已删除补录',
                icon: 'success'
            });
            await this.loadDetail();
        }
        catch (error) {
            console.error('delete manual bill failed', error);
            wx.showToast({
                title: resolveBillActionErrorMessage(error),
                icon: 'none'
            });
        }
        finally {
            this.setData({
                deletingBillId: ''
            });
        }
    },
    openRepairDialog() {
        this.setData({
            repairDialogVisible: true,
            repairForm: {
                expenseTypeIndex: 0,
                categoryIndex: 0,
                note: '',
                occurredAt: new Date().toISOString().slice(0, 10),
                amount: ''
            }
        });
    },
    closeRepairDialog() {
        this.setData({
            repairDialogVisible: false
        });
    },
    handleRepairCategoryChange(event) {
        const categoryIndex = Number(event.detail.value || 0);
        this.setData({
            repairForm: {
                ...this.data.repairForm,
                categoryIndex
            }
        });
    },
    handleOwnerExpenseTypeChange(event) {
        const expenseTypeIndex = Number(event.detail.value || 0);
        this.setData({
            repairForm: {
                ...this.data.repairForm,
                expenseTypeIndex
            }
        });
    },
    handleRepairInputChange(event) {
        const field = event.currentTarget.dataset.field;
        this.setData({
            repairForm: {
                ...this.data.repairForm,
                [field]: event.detail.value
            }
        });
    },
    handleRepairDateChange(event) {
        const occurredAt = String(event.detail.value || '');
        this.setData({
            repairForm: {
                ...this.data.repairForm,
                occurredAt
            }
        });
    },
    async confirmRepairRecord() {
        const selectedExpenseType = OWNER_EXPENSE_TYPE_OPTIONS[this.data.repairForm.expenseTypeIndex]?.key ?? 'repair';
        const selectedCategory = REPAIR_CATEGORY_OPTIONS[this.data.repairForm.categoryIndex]?.key ?? 'other';
        const note = String(this.data.repairForm.note || '').trim();
        const occurredAt = String(this.data.repairForm.occurredAt || '').trim();
        const amountText = String(this.data.repairForm.amount || '').trim();
        const amount = amountText ? Number(amountText) : null;
        const roomId = String(this.data.roomId || '').trim();
        if (selectedExpenseType === 'repair' && !note) {
            wx.showToast({
                title: '请填写维修备注',
                icon: 'none'
            });
            return;
        }
        if (!occurredAt) {
            wx.showToast({
                title: '请选择发生日期',
                icon: 'none'
            });
            return;
        }
        if (!roomId) {
            wx.showToast({
                title: '缺少房间信息，请返回后重试',
                icon: 'none'
            });
            return;
        }
        if (amountText && (!Number.isFinite(amount) || Number(amount) < 0)) {
            wx.showToast({
                title: '请填写有效支出金额',
                icon: 'none'
            });
            return;
        }
        try {
            await (0, owner_expense_1.saveOwnerExpense)({
                roomId,
                expenseType: selectedExpenseType,
                amount,
                note,
                occurredAt,
                repairCategory: selectedExpenseType === 'repair' ? selectedCategory : undefined
            });
            this.setData({
                repairDialogVisible: false
            });
            wx.showToast({
                title: '维修/支出已保存',
                icon: 'success'
            });
            await this.loadDetail();
        }
        catch (error) {
            console.error('save repair record failed', error);
            wx.showToast({
                title: resolveRepairSaveErrorMessage(error),
                icon: 'none'
            });
        }
    },
    async handleEndLease() {
        const leaseId = this.data.detail?.activeLease?.id;
        if (!leaseId) {
            return;
        }
        const confirmation = await wx.showModal({
            title: '结束租约',
            content: '确认结束当前租约后，历史记录会保留。若仍有未收账单，可选择保留欠款、作废未收系统账单，或修改截止日期后重算。'
        });
        if (!confirmation.confirm) {
            return;
        }
        const closeResult = await this.endLeaseWithRetry(String(leaseId));
        if (!closeResult.success) {
            wx.showToast({
                title: closeResult.isTimeout ? '请求超时，请稍后重试' : '结束租约失败，请稍后重试',
                icon: 'none'
            });
            return;
        }
        wx.showToast({
            title: '租约已结束',
            icon: 'success'
        });
    },
    async handleDeleteLease() {
        const leaseId = this.data.detail?.activeLease?.id;
        if (!leaseId) {
            return;
        }
        try {
            const checkResult = await (0, lease_1.deleteLease)({
                leaseId,
                mode: 'check'
            });
            if (!checkResult.canDelete) {
                const blockerText = (checkResult.blockers ?? [])
                    .map((item) => ({
                    paid_bill: '已有已收账单',
                    receipt: '已有收据引用',
                    repair_record: '已有维修记录',
                    owner_expense: '已有房东支出'
                }[item.code] ?? item.code))
                    .join('、');
                await wx.showModal({
                    title: '不能安全删除租约',
                    content: `${blockerText || '存在历史关联'}，请改用编辑、更正、结束或作废。`,
                    showCancel: false
                });
                return;
            }
            const confirmation = await wx.showModal({
                title: '安全删除租约',
                content: `确认删除当前录错租约？将同步删除 ${checkResult.unpaidBillCount || 0} 笔未收且无收据引用的账单。`,
                confirmText: '确认删除'
            });
            if (!confirmation.confirm) {
                return;
            }
            await (0, lease_1.deleteLease)({
                leaseId,
                mode: 'delete',
                confirm: true
            });
            wx.showToast({
                title: '租约已删除',
                icon: 'success'
            });
            await this.loadDetail();
        }
        catch (error) {
            console.error('delete lease failed', error);
            wx.showToast({
                title: '删除失败，请稍后重试',
                icon: 'none'
            });
        }
    },
    async openRenewLeaseForm(event) {
        if (this.data.renewingLease) {
            return;
        }
        const eventLeaseId = String(event?.currentTarget?.dataset?.leaseId || '');
        const baseLease = eventLeaseId
            ? resolveRenewBaseLeaseById(this.data.detail, eventLeaseId)
            : resolveRenewBaseLease(this.data.detail);
        const roomId = String(this.data.roomId || this.data.detail?.room?.id || '');
        if (!baseLease?.id || !roomId || !baseLease.tenantId) {
            wx.showToast({
                title: '当前无可续租的到期租约',
                icon: 'none'
            });
            return;
        }
        let action;
        try {
            action = await wx.showActionSheet({
                itemList: ['续租6个月', '续租1年', '续租2年']
            });
        }
        catch {
            return;
        }
        const monthOptions = [6, 12, 24];
        const months = monthOptions[action.tapIndex] ?? 12;
        const baseEndDate = String(baseLease.actualEndDate || baseLease.endDate || '').slice(0, 10);
        const startDate = addDays(baseEndDate, 1);
        const endDate = addMonthsInclusive(startDate, months);
        const renewFee = resolveRenewFeeRules(baseLease);
        const confirmation = await wx.showModal({
            title: '确认续租',
            content: `新租期：${startDate} 至 ${endDate}。仅生成租金和周期性固定费用，不重复收押金、消防押金、锁卡押金和一次性费用。`,
            confirmText: '确认续租'
        });
        if (!confirmation.confirm) {
            return;
        }
        this.setData({
            renewingLease: true
        });
        try {
            await (0, lease_1.saveLease)({
                lease: {
                    roomId,
                    tenantId: String(baseLease.tenantId || ''),
                    startDate,
                    endDate,
                    billingCycleDays: Number(baseLease.billingCycleDays || 30),
                    rentAmount: renewFee.rentAmount,
                    depositAmount: 0,
                    feeRules: renewFee.feeRules,
                    note: String(baseLease.note || '')
                }
            });
            wx.showToast({
                title: '续租成功',
                icon: 'success'
            });
            await this.loadDetail();
        }
        catch (error) {
            console.error('renew lease failed', error);
            wx.showToast({
                title: resolveLeaseSaveErrorMessage(error),
                icon: 'none'
            });
        }
        finally {
            this.setData({
                renewingLease: false
            });
        }
    },
    async endLeaseWithRetry(leaseId) {
        const confirmLeaseClosed = async () => {
            for (let attempt = 0; attempt < 3; attempt += 1) {
                try {
                    await this.loadDetail();
                    if (!this.data.detail?.activeLease?.id) {
                        return true;
                    }
                }
                catch (pollingError) {
                    console.warn('polling lease detail after end failed', pollingError);
                }
                if (attempt < 2) {
                    await new Promise((resolve) => setTimeout(resolve, 600));
                }
            }
            return false;
        };
        let leaseClosed = false;
        let isTimeout = false;
        try {
            const result = await (0, lease_1.endLease)({ leaseId });
            if ((result.unpaidBillSummary?.count ?? 0) > 0) {
                await wx.showModal({
                    title: '未收账单处理',
                    content: '当前仍有未收账单。可保留欠款、作废未收系统账单，或修改截止日期后重算。',
                    showCancel: false
                });
            }
            leaseClosed = await confirmLeaseClosed();
        }
        catch (error) {
            console.error('end lease failed', error);
            const payload = error;
            const message = `${payload?.errMsg ?? ''} ${payload?.message ?? ''} ${error instanceof Error ? error.message : ''}`.toLowerCase();
            isTimeout = message.includes('timeout');
            leaseClosed = await confirmLeaseClosed();
            if (!leaseClosed) {
                return { success: false, isTimeout };
            }
        }
        if (!leaseClosed) {
            return { success: false, isTimeout: false };
        }
        const pages = getCurrentPages();
        const previousPage = pages[pages.length - 2];
        if (previousPage?.loadUnits) {
            try {
                await previousPage.loadUnits();
            }
            catch (refreshError) {
                console.warn('refresh units list after end lease failed', refreshError);
            }
        }
        return { success: true, isTimeout: false };
    }
});
