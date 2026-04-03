import { endLease } from '../../services/lease';
import { receiveBill, saveBill } from '../../services/bill';
import { getRentableUnitDetail } from '../../services/rentable-unit';

type MonthlyBillItem = {
  id: string;
  label: string;
  dueDate: string;
  amount: number;
  status: string;
  section: string;
  receivedAt?: string | null;
};

type DetailPayload = Record<string, any> & {
  monthlyBillGroups?: Array<{
    monthKey: string;
    monthLabel: string;
    expandedByDefault: boolean;
    items: MonthlyBillItem[];
  }>;
  historyCollapsedByDefault?: boolean;
};

function formatStatusLabel(status: string) {
  const mapping: Record<string, string> = {
    pending: '待收',
    due_today: '今日到期',
    paid: '已收',
    overdue: '逾期'
  };

  return mapping[status] ?? status;
}

const MANUAL_BILL_TYPE_KEYS = ['water', 'electricity', 'repair', 'custom'] as const;
const MANUAL_BILL_TYPE_LABELS = ['水费', '电费', '维修费', '其他费用'];

function buildManualBillMeta(typeIndex: number, currentLabel = '') {
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
    detail: null as DetailPayload | null,
    historyCollapsed: true,
    expandedMonths: {} as Record<string, boolean>,
    paymentDialogVisible: false,
    paymentForm: {
      billId: '',
      title: '',
      amount: '',
      dueDate: ''
    },
    manualBillTypeOptions: MANUAL_BILL_TYPE_LABELS,
    manualBillDialogVisible: false,
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
    }
  },
  async loadDetail(roomId?: string) {
    const nextRoomId = roomId ?? this.data.roomId;
    const detail = (await getRentableUnitDetail({ roomId: nextRoomId })) as DetailPayload;
    const monthlyBillGroups = (detail.monthlyBillGroups ?? []).map((group) => ({
      ...group,
      items: group.items.map((item) => ({
        ...item,
        statusLabel: formatStatusLabel(item.status)
      }))
    }));
    const expandedMonths = monthlyBillGroups.reduce<Record<string, boolean>>((acc, group) => {
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
  async onLoad(query: Record<string, string>) {
    const roomId = query.roomId;
    await this.loadDetail(roomId);
  },
  toggleHistory() {
    this.setData({
      historyCollapsed: !this.data.historyCollapsed
    });
  },
  toggleMonth(event: WechatMiniprogram.BaseEvent) {
    const monthKey = event.currentTarget.dataset.monthKey as string;
    if (!monthKey) {
      return;
    }

    const nextExpanded = !this.data.expandedMonths[monthKey];
    const expandedMonths = Object.keys(this.data.expandedMonths).reduce<Record<string, boolean>>((acc, key) => {
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
  openPaymentDialog(event: WechatMiniprogram.BaseEvent) {
    const billId = event.currentTarget.dataset.billId as string;
    const amount = String(event.currentTarget.dataset.amount ?? '');
    const title = event.currentTarget.dataset.title as string;
    const dueDate = event.currentTarget.dataset.dueDate as string;

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
  handlePaymentAmountChange(event: WechatMiniprogram.Input) {
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

    await receiveBill({
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

  openManualBillDialog(event: WechatMiniprogram.BaseEvent) {
    const monthKey = event.currentTarget.dataset.monthKey as string;
    const monthLabel = event.currentTarget.dataset.monthLabel as string;

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
  handleManualBillTypeChange(event: WechatMiniprogram.PickerChange) {
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
  handleManualBillInputChange(event: WechatMiniprogram.Input) {
    const field = event.currentTarget.dataset.field as 'itemLabel' | 'amount';
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

    await saveBill({
      leaseId,
      monthKey,
      type: selectedType === 'repair' ? 'custom' : selectedType,
      amount: numericAmount,
      itemLabel:
        selectedType === 'repair' ? trimmedLabel || '维修费' : selectedType === 'custom' ? trimmedLabel : undefined
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

    await endLease({ leaseId });
    wx.showToast({
      title: '租约已结束',
      icon: 'success'
    });
    await wx.navigateBack();
  }
});
