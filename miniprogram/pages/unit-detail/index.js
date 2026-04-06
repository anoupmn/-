"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lease_1 = require("../../services/lease");
const bill_1 = require("../../services/bill");
const repair_1 = require("../../services/repair");
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
const MANUAL_BILL_TYPE_KEYS = ['water', 'electricity', 'repair', 'custom'];
const MANUAL_BILL_TYPE_LABELS = ['水费', '电费', '维修费', '其他费用'];
const REPAIR_CATEGORY_OPTIONS = [
    { key: 'plumbing', label: '水路' },
    { key: 'electrical', label: '电路' },
    { key: 'appliance', label: '家电' },
    { key: 'structure', label: '结构' },
    { key: 'safety', label: '安全' },
    { key: 'other', label: '其他' }
];
function buildManualBillMeta(typeIndex, currentLabel = '') {
    if (typeIndex === 2) {
        return {
            showLabelInput: true,
            labelPlaceholder: '维修费名称，可写成维修费-门锁',
            itemLabel: currentLabel || '维修费'
        };
    }
    if (typeIndex === 3) {
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
Page({
    data: {
        roomId: '',
        detail: null,
        historyCollapsed: true,
        expandedMonths: {},
        paymentDialogVisible: false,
        paymentForm: {
            billId: '',
            title: '',
            amount: '',
            dueDate: ''
        },
        manualBillTypeOptions: MANUAL_BILL_TYPE_LABELS,
        manualBillDialogVisible: false,
        repairCategoryOptions: REPAIR_CATEGORY_OPTIONS.map((item) => item.label),
        repairDialogVisible: false,
        manualBillMeta: {
            showLabelInput: false,
            labelPlaceholder: ''
        },
        manualBillForm: {
            monthKey: '',
            monthLabel: '',
            typeIndex: 0,
            itemLabel: '',
            amount: ''
        },
        repairForm: {
            categoryIndex: 0,
            note: '',
            occurredAt: ''
        }
    },
    async loadDetail(roomId) {
        const nextRoomId = roomId ?? this.data.roomId;
        const detail = (await (0, rentable_unit_1.getRentableUnitDetail)({ roomId: nextRoomId }));
        const monthlyBillGroups = (detail.monthlyBillGroups ?? []).map((group) => ({
            ...group,
            items: group.items.map((item) => ({
                ...item,
                statusLabel: formatStatusLabel(item.status)
            }))
        }));
        const expandedMonths = monthlyBillGroups.reduce((acc, group) => {
            acc[group.monthKey] = group.expandedByDefault;
            return acc;
        }, {});
        this.setData({
            roomId: nextRoomId,
            detail: {
                ...detail,
                monthlyBillGroups
            },
            expandedMonths,
            historyCollapsed: detail.historyCollapsedByDefault ?? true
        });
    },
    async onLoad(query) {
        const roomId = query.roomId;
        await this.loadDetail(roomId);
    },
    toggleHistory() {
        this.setData({
            historyCollapsed: !this.data.historyCollapsed
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
        const billId = this.data.paymentForm.billId;
        const receivedAmount = Number(this.data.paymentForm.amount || 0);
        if (!billId || !receivedAmount) {
            wx.showToast({
                title: '请填写有效金额',
                icon: 'none'
            });
            return;
        }
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
    },
    openManualBillDialog(event) {
        const monthKey = event.currentTarget.dataset.monthKey;
        const monthLabel = event.currentTarget.dataset.monthLabel;
        if (!monthKey) {
            return;
        }
        const meta = buildManualBillMeta(0);
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
                amount: ''
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
        this.setData({
            manualBillMeta: {
                showLabelInput: meta.showLabelInput,
                labelPlaceholder: meta.labelPlaceholder
            },
            manualBillForm: {
                ...this.data.manualBillForm,
                typeIndex,
                itemLabel: meta.itemLabel
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
        const leaseId = this.data.detail?.activeLease?.id;
        const { monthKey, typeIndex, itemLabel, amount } = this.data.manualBillForm;
        const numericAmount = Number(amount || 0);
        const selectedType = MANUAL_BILL_TYPE_KEYS[typeIndex] ?? 'water';
        if (!leaseId || !monthKey) {
            wx.showToast({
                title: '当前租约不存在',
                icon: 'none'
            });
            return;
        }
        if (!numericAmount) {
            wx.showToast({
                title: '请填写有效金额',
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
        await (0, bill_1.saveBill)({
            leaseId,
            monthKey,
            type: selectedType === 'repair' ? 'custom' : selectedType,
            amount: numericAmount,
            itemLabel: selectedType === 'repair' ? trimmedLabel || '维修费' : selectedType === 'custom' ? trimmedLabel : undefined
        });
        this.setData({
            manualBillDialogVisible: false
        });
        wx.showToast({
            title: '费用已补录',
            icon: 'success'
        });
        await this.loadDetail();
    },
    openRepairDialog() {
        this.setData({
            repairDialogVisible: true,
            repairForm: {
                categoryIndex: 0,
                note: '',
                occurredAt: new Date().toISOString().slice(0, 10)
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
        const selectedCategory = REPAIR_CATEGORY_OPTIONS[this.data.repairForm.categoryIndex]?.key ?? 'other';
        const note = String(this.data.repairForm.note || '').trim();
        const occurredAt = String(this.data.repairForm.occurredAt || '').trim();
        if (!note) {
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
        await (0, repair_1.saveRepairRecord)({
            roomId: this.data.roomId,
            category: selectedCategory,
            note,
            occurredAt
        });
        this.setData({
            repairDialogVisible: false
        });
        wx.showToast({
            title: '维修记录已保存',
            icon: 'success'
        });
        await this.loadDetail();
    },
    async handleEndLease() {
        const leaseId = this.data.detail?.activeLease?.id;
        if (!leaseId) {
            return;
        }
        const confirmation = await wx.showModal({
            title: '结束租约',
            content: '确认结束当前租约后，单元状态会重新计算，历史记录会保留。'
        });
        if (!confirmation.confirm) {
            return;
        }
        await (0, lease_1.endLease)({ leaseId });
        wx.showToast({
            title: '租约已结束',
            icon: 'success'
        });
        await wx.navigateBack();
    }
});
