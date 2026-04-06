import { endLease } from '../../services/lease';
import { receiveBill, saveBill } from '../../services/bill';
import { saveRepairRecord } from '../../services/repair';
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

type LeaseHistoryView = {
  leaseId: string;
  tenantName: string;
  tenantPhone: string;
  startDate: string;
  endDate: string;
  originalPeriodLabel: string;
  actualPeriodLabel: string;
  terminationRemark: string;
  repairCount: number;
  repairs: Array<{
    id: string;
    occurredAt: string;
    categoryLabel: string;
    note: string;
  }>;
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

function formatDateLabel(date: string) {
  const matched = String(date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!matched) {
    return date || '';
  }

  return `${matched[1]}年${matched[2]}月${matched[3]}日`;
}

function formatPeriodLabel(startDate: string, endDate: string) {
  return `${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}`;
}

function normalizeClosedDate(raw: unknown) {
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

function hasOutstandingActiveBills(detail: DetailPayload | null) {
  const monthlyBillGroups = Array.isArray(detail?.monthlyBillGroups) ? detail.monthlyBillGroups : [];

  return monthlyBillGroups.some((group) =>
    Array.isArray(group.items) &&
    group.items.some((item) => String(item.status || '').toLowerCase() !== 'paid')
  );
}

function getLocalDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shouldPromptExpiryEndLease(detail: DetailPayload | null) {
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

function buildLeaseHistoryViews(detail: DetailPayload): LeaseHistoryView[] {
  const leaseHistory = Array.isArray(detail.leaseHistory) ? detail.leaseHistory : [];
  const tenantHistory = Array.isArray(detail.tenantHistory) ? detail.tenantHistory : [];
  const repairHistory = Array.isArray(detail.repairHistory) ? detail.repairHistory : [];
  const tenantPeriodRepairs = Array.isArray(detail.tenantPeriodRepairs) ? detail.tenantPeriodRepairs : [];
  const activeLeaseId = String(detail.activeLease?.id || '');

  const tenantPhoneMap = tenantHistory.reduce<Map<string, string>>((acc, tenant) => {
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
  }, new Map<string, string>());
  const perLeaseCountMap = new Map<string, number>(
    tenantPeriodRepairs.map((item) => [String(item.leaseId || ''), Number(item.count || 0)])
  );

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

const MANUAL_BILL_TYPE_KEYS = ['water', 'electricity', 'repair', 'custom'] as const;
const MANUAL_BILL_TYPE_LABELS = ['水费', '电费', '维修费', '其他费用'];
const REPAIR_CATEGORY_OPTIONS = [
  { key: 'plumbing', label: '水路' },
  { key: 'electrical', label: '电路' },
  { key: 'appliance', label: '家电' },
  { key: 'structure', label: '结构' },
  { key: 'safety', label: '安全' },
  { key: 'other', label: '其他' }
] as const;

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
    leaseHistoryViews: [] as LeaseHistoryView[],
    expandedLeaseHistory: {} as Record<string, boolean>,
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
    const leaseHistoryViews = buildLeaseHistoryViews(detail);
    const previousExpandedState = this.data.expandedLeaseHistory ?? {};
    let hasExpandedItem = false;
    const expandedLeaseHistory = leaseHistoryViews.reduce<Record<string, boolean>>((acc, item) => {
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
      leaseHistoryViews,
      expandedLeaseHistory,
      expandedMonths,
    });
  },
  async onLoad(query: Record<string, string>) {
    const roomId = query.roomId;
    await this.loadDetail(roomId);
  },
  toggleLeaseHistoryItem(event: WechatMiniprogram.BaseEvent) {
    const leaseId = String(event.currentTarget.dataset.leaseId || '');

    if (!leaseId) {
      return;
    }

    const nextExpanded = !this.data.expandedLeaseHistory[leaseId];
    const resetState = Object.keys(this.data.expandedLeaseHistory).reduce<Record<string, boolean>>((acc, id) => {
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
  handleRepairCategoryChange(event: WechatMiniprogram.PickerChange) {
    const categoryIndex = Number(event.detail.value || 0);
    this.setData({
      repairForm: {
        ...this.data.repairForm,
        categoryIndex
      }
    });
  },
  handleRepairInputChange(event: WechatMiniprogram.Input) {
    const field = event.currentTarget.dataset.field as 'note' | 'occurredAt';
    this.setData({
      repairForm: {
        ...this.data.repairForm,
        [field]: event.detail.value
      }
    });
  },
  handleRepairDateChange(event: WechatMiniprogram.PickerChange) {
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

    await saveRepairRecord({
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
  async endLeaseWithRetry(leaseId: string) {
    const confirmLeaseClosed = async () => {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          await this.loadDetail();
          if (!this.data.detail?.activeLease?.id) {
            return true;
          }
        } catch (pollingError) {
          console.warn('polling lease detail after end failed', pollingError);
        }

        if (attempt < 2) {
          await new Promise<void>((resolve) => setTimeout(resolve, 600));
        }
      }

      return false;
    };

    let leaseClosed = false;
    let isTimeout = false;
    try {
      await endLease({ leaseId });
      leaseClosed = await confirmLeaseClosed();
    } catch (error) {
      console.error('end lease failed', error);
      const payload = error as { errMsg?: string; message?: string } | undefined;
      const message = `${payload?.errMsg ?? ''} ${payload?.message ?? ''} ${
        error instanceof Error ? error.message : ''
      }`.toLowerCase();
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
    const previousPage = pages[pages.length - 2] as
      | {
          loadUnits?: () => Promise<void>;
        }
      | undefined;

    if (previousPage?.loadUnits) {
      try {
        await previousPage.loadUnits();
      } catch (refreshError) {
        console.warn('refresh units list after end lease failed', refreshError);
      }
    }

    return { success: true, isTimeout: false };
  }
});
