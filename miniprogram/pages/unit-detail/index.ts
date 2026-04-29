import { deleteLease, endLease, saveLease } from '../../services/lease';
import { deleteBill, receiveBill, saveBill } from '../../services/bill';
import { saveOwnerExpense } from '../../services/owner-expense';
import { getRentableUnitDetail } from '../../services/rentable-unit';
import { createReceipt } from '../../services/receipt';

type MonthlyBillItem = {
  id: string;
  leaseId?: string;
  type?: 'water' | 'electricity' | string;
  label: string;
  dueDate: string;
  amount: number;
  status: string;
  section: string;
  responsibility?: 'tenant' | string;
  source?: 'system' | 'manual';
  isManual?: boolean;
  receivedAt?: string | null;
  displayReceivedAt?: string;
  receivedAmount?: number | null;
  note?: string;
  meterReading?: {
    previousReading: number;
    currentReading: number;
    usage: number;
    unitPrice: number;
  };
  isReceivedAmountMismatch?: boolean;
  receiptId?: string;
  receiptNo?: string;
  canCreateReceipt?: boolean;
};

type DetailPayload = Record<string, any> & {
  meterDefaults?: Partial<Record<'water' | 'electricity', {
    previousReading: number;
    unitPrice: number;
  } | null>>;
  monthlyBillGroups?: Array<{
    monthKey: string;
    monthLabel: string;
    expandedByDefault: boolean;
    items: MonthlyBillItem[];
    monthReceiptId?: string;
    monthReceiptNo?: string;
    canIssueMonthReceipt?: boolean;
    receiptLeaseId?: string;
    receiptableBillCount?: number;
    receiptableTotalAmount?: number;
  }>;
  historyCollapsedByDefault?: boolean;
};

type YearlyBillGroup = {
  yearKey: string;
  yearLabel: string;
  expandedByDefault: boolean;
  months: Array<NonNullable<DetailPayload['monthlyBillGroups']>[number]>;
};

type RenewBaseLease = Record<string, any> & {
  id: string;
  roomId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  actualEndDate?: string;
  billingCycleDays?: number;
  rentAmount?: number;
  depositAmount?: number;
  feeRules?: Record<string, any>;
  note?: string;
};

type RenewCustomFeeDraft = {
  key: string;
  label: string;
  amount: string;
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

function formatDateTime(value: unknown) {
  const source = String(value || '').trim();
  if (!source) {
    return '';
  }

  const matched = source.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/);
  if (matched) {
    return `${matched[1]} ${matched[2]}`;
  }

  return source.replace('T', ' ').replace(/\.\d{3}Z?$/, '').replace(/Z$/, '');
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

function resolveBillActionErrorMessage(error: unknown) {
  const payload = error as { message?: string; errMsg?: string } | undefined;
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

function resolveRepairSaveErrorMessage(error: unknown) {
  const payload = error as { message?: string; errMsg?: string } | undefined;
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

function resolveLeaseSaveErrorMessage(error: unknown) {
  const payload = error as { message?: string; errMsg?: string } | undefined;
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

function resolveRenewBaseLease(detail: DetailPayload | null) {
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

function resolveRenewBaseLeaseById(detail: DetailPayload | null, leaseId: string): RenewBaseLease | null {
  if (!detail || !leaseId) {
    return null;
  }

  if (String(detail.activeLease?.id || '') === leaseId) {
    return detail.activeLease;
  }

  const leaseHistory = Array.isArray(detail.leaseHistory) ? detail.leaseHistory : [];
  return leaseHistory.find((lease) => String(lease.id || '') === leaseId) ?? null;
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + days);
  return formatDateKey(date);
}

function addMonthsInclusive(startDate: string, months: number) {
  const date = new Date(`${startDate}T00:00:00`);
  date.setMonth(date.getMonth() + months);
  date.setDate(date.getDate() - 1);
  return formatDateKey(date);
}

function buildRenewCustomFeeDrafts(baseLease: RenewBaseLease): RenewCustomFeeDraft[] {
  const feeRules = baseLease.feeRules ?? {};
  return Array.isArray(feeRules.customFeeItems)
    ? feeRules.customFeeItems
      .filter((item) =>
        item?.feeNature === 'recurring' &&
        item?.cadence !== 'once' &&
        Number(item.amount || 0) > 0
      )
      .map((item, index) => ({
        key: String(item.key || `renew_custom_${index + 1}`),
        label: String(item.label || '自定义费用'),
        amount: String(item.amount || '')
      }))
    : [];
}

function resolveRenewFeeRules(input: {
  rentAmount: string;
  managementAmount: string;
  customFeeItems: RenewCustomFeeDraft[];
}) {
  const rentAmount = Number(input.rentAmount || 0);
  const managementAmount = Number(input.managementAmount || 0);
  const customFeeItems = input.customFeeItems
    .filter((item) => String(item.label || '').trim() && Number(item.amount || 0) > 0)
    .map((item, index) => ({
      key: item.key || `renew_custom_${index + 1}`,
      label: String(item.label || '').trim(),
      amount: Number(item.amount || 0),
      cadence: 'cycle' as const,
      feeNature: 'recurring' as const
    }));

  return {
    rentAmount,
    feeRules: {
      rent: {
        amount: rentAmount,
        cadence: 'cycle' as const
      },
      deposit: {
        amount: 0,
        cadence: 'once' as const
      },
      management: managementAmount > 0
        ? { amount: managementAmount, cadence: 'cycle' as const }
        : undefined,
      customFeeItems
    }
  };
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

function buildYearlyBillGroups(monthlyBillGroups: NonNullable<DetailPayload['monthlyBillGroups']>): YearlyBillGroup[] {
  const currentYear = String(new Date().getFullYear());
  const yearMap = monthlyBillGroups.reduce<Map<string, YearlyBillGroup>>((acc, group) => {
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
  }, new Map<string, YearlyBillGroup>());
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

const MANUAL_BILL_TYPE_KEYS = ['water', 'electricity', 'custom'] as const;
const MANUAL_BILL_TYPE_LABELS = ['水费', '电费', '其他费用'];
const REPAIR_CATEGORY_OPTIONS = [
  { key: 'plumbing', label: '水路' },
  { key: 'electrical', label: '电路' },
  { key: 'appliance', label: '家电' },
  { key: 'structure', label: '结构' },
  { key: 'safety', label: '安全' },
  { key: 'other', label: '其他' }
] as const;
const OWNER_EXPENSE_TYPE_OPTIONS = [
  { key: 'repair', label: '维修' },
  { key: 'cleaning', label: '保洁' },
  { key: 'caretaking', label: '打理' },
  { key: 'labor', label: '请人管理' },
  { key: 'other', label: '其他支出' }
] as const;

function buildManualBillMeta(typeIndex: number, currentLabel = '') {
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

function isUtilityBillType(type: string): type is 'water' | 'electricity' {
  return type === 'water' || type === 'electricity';
}

function formatNumberInput(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? String(numeric) : '';
}

function canCreateReceiptFromBill(item: MonthlyBillItem) {
  return (
    item.status === 'paid' &&
    (item.responsibility ?? 'tenant') === 'tenant' &&
    Boolean(item.receivedAt) &&
    item.receivedAmount != null &&
    !item.receiptId
  );
}

Page({
  data: {
    roomId: '',
    detail: null as DetailPayload | null,
    leaseHistoryViews: [] as LeaseHistoryView[],
    expandedLeaseHistory: {} as Record<string, boolean>,
    expandedYears: {} as Record<string, boolean>,
    expandedMonths: {} as Record<string, boolean>,
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
    creatingMergedReceiptMonth: '',
    deletingBillId: '',
    repairCategoryOptions: REPAIR_CATEGORY_OPTIONS.map((item) => item.label),
    ownerExpenseTypeOptions: OWNER_EXPENSE_TYPE_OPTIONS.map((item) => item.label),
    repairDialogVisible: false,
    renewDialogVisible: false,
    renewingLease: false,
    renewForm: {
      sourceLeaseId: '',
      startDate: '',
      endDate: '',
      rentAmount: '',
      managementAmount: '',
      customFeeItems: [] as RenewCustomFeeDraft[]
    },
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
  async loadDetail(roomId?: string) {
    const nextRoomId = roomId ?? this.data.roomId;
    const detail = (await getRentableUnitDetail({ roomId: nextRoomId })) as DetailPayload;
    const monthlyBillGroups = (detail.monthlyBillGroups ?? []).map((group) => {
      const items = group.items.map((item) => ({
        ...item,
        responsibility: item.responsibility ?? 'tenant',
        source: (item.source === 'manual' ? 'manual' : 'system') as 'system' | 'manual',
        isManual: item.source === 'manual',
        displayReceivedAt: formatDateTime(item.receivedAt),
        isReceivedAmountMismatch:
          item.isReceivedAmountMismatch === true
          || (item.receivedAmount != null && Math.abs(Number(item.receivedAmount) - Number(item.amount || 0)) >= 0.01),
        statusLabel: formatStatusLabel(item.status),
        canCreateReceipt: canCreateReceiptFromBill({
          ...item,
          responsibility: item.responsibility ?? 'tenant'
        })
      }));
      const receiptCandidateItems = items.filter(canCreateReceiptFromBill);
      const monthReceiptItem = items.find((item) => item.receiptId);

      return {
        ...group,
        items,
        monthReceiptId: monthReceiptItem?.receiptId || '',
        monthReceiptNo: monthReceiptItem?.receiptNo || '',
        canIssueMonthReceipt: !monthReceiptItem?.receiptId && receiptCandidateItems.length > 0,
        receiptLeaseId: receiptCandidateItems[0]?.leaseId || monthReceiptItem?.leaseId || detail.activeLease?.id || '',
        receiptableBillCount: receiptCandidateItems.length,
        receiptableTotalAmount: receiptCandidateItems.reduce((sum, item) => sum + Number(item.receivedAmount ?? 0), 0)
      };
    });
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

    const yearBillGroups = buildYearlyBillGroups(monthlyBillGroups);
    const expandedYears = yearBillGroups.reduce<Record<string, boolean>>((acc, group) => {
      acc[group.yearKey] = group.expandedByDefault;
      return acc;
    }, {});
    const expandedMonths = monthlyBillGroups.reduce<Record<string, boolean>>((acc, group) => {
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
  async onLoad(query: Record<string, string>) {
    const roomId = query.roomId;
    try {
      await this.loadDetail(roomId);
    } catch (error) {
      console.error('load unit detail on page init failed', error);
      wx.showToast({
        title: '页面加载失败，请返回重试',
        icon: 'none'
      });
    }
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
  toggleYear(event: WechatMiniprogram.BaseEvent) {
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
  async createMergedMonthReceipt(event: WechatMiniprogram.BaseEvent) {
    const month = String(event.currentTarget.dataset.monthKey || '');
    const leaseId = String(event.currentTarget.dataset.leaseId || '');
    const receiptId = String(event.currentTarget.dataset.receiptId || '');

    if (receiptId) {
      wx.navigateTo({
        url: `/pages/receipt/index?receiptId=${receiptId}`
      });
      return;
    }

    if (!month || !leaseId || this.data.creatingMergedReceiptMonth) {
      return;
    }

    this.setData({
      creatingMergedReceiptMonth: month
    });

    try {
      const receipt = await createReceipt({ leaseId, month });
      const receiptId = String((receipt as Record<string, any>).id || '');
      const receiptNo = String((receipt as Record<string, any>).receiptNo || '');

      wx.showToast({
        title: receiptNo ? `收据已生成 ${receiptNo}` : '收据已生成',
        icon: 'success'
      });

      if (receiptId) {
        wx.navigateTo({
          url: `/pages/receipt/index?receiptId=${receiptId}`
        });
      }
    } catch (error) {
      console.error('create merged receipt failed', error);
      wx.showToast({
        title: '收据生成失败',
        icon: 'none'
      });
    } finally {
      this.setData({
        creatingMergedReceiptMonth: ''
      });
    }
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
    } catch (error) {
      console.error('confirm payment failed', error);
      wx.showToast({
        title: resolveBillActionErrorMessage(error),
        icon: 'none'
      });
    } finally {
      this.setData({
        paymentSubmitting: false
      });
    }
  },

  openManualBillDialog(event: WechatMiniprogram.BaseEvent) {
    const monthKey = event.currentTarget.dataset.monthKey as string;
    const monthLabel = event.currentTarget.dataset.monthLabel as string;

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
  handleManualBillTypeChange(event: WechatMiniprogram.PickerChange) {
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
  handleManualBillInputChange(event: WechatMiniprogram.Input) {
    const field = event.currentTarget.dataset.field as
      | 'itemLabel'
      | 'amount'
      | 'previousReading'
      | 'currentReading'
      | 'unitPrice'
      | 'note';
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
        await saveBill({
          leaseId,
          monthKey,
          type: selectedType,
          previousReading: previousReadingValue,
          currentReading: currentReadingValue,
          unitPrice: unitPriceValue,
          note: String(note || '').trim()
        });
      } else {
        await saveBill({
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
    } catch (error) {
      console.error('save manual bill failed', error);
      wx.showToast({
        title: resolveBillActionErrorMessage(error),
        icon: 'none'
      });
    } finally {
      this.setData({
        manualBillSubmitting: false
      });
    }
  },
  async handleDeleteManualBill(event: WechatMiniprogram.BaseEvent) {
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
      await deleteBill({ billId });
      wx.showToast({
        title: '已删除补录',
        icon: 'success'
      });
      await this.loadDetail();
    } catch (error) {
      console.error('delete manual bill failed', error);
      wx.showToast({
        title: resolveBillActionErrorMessage(error),
        icon: 'none'
      });
    } finally {
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
  handleRepairCategoryChange(event: WechatMiniprogram.PickerChange) {
    const categoryIndex = Number(event.detail.value || 0);
    this.setData({
      repairForm: {
        ...this.data.repairForm,
        categoryIndex
      }
    });
  },
  handleOwnerExpenseTypeChange(event: WechatMiniprogram.PickerChange) {
    const expenseTypeIndex = Number(event.detail.value || 0);
    this.setData({
      repairForm: {
        ...this.data.repairForm,
        expenseTypeIndex
      }
    });
  },
  handleRepairInputChange(event: WechatMiniprogram.Input) {
    const field = event.currentTarget.dataset.field as 'note' | 'occurredAt' | 'amount';
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
      await saveOwnerExpense({
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
    } catch (error) {
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
      const checkResult = await deleteLease({
        leaseId,
        mode: 'check'
      }) as {
        canDelete?: boolean;
        blockers?: Array<{ code: string; count: number }>;
        unpaidBillCount?: number;
      };

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

      await deleteLease({
        leaseId,
        mode: 'delete',
        confirm: true
      });
      wx.showToast({
        title: '租约已删除',
        icon: 'success'
      });
      await this.loadDetail();
    } catch (error) {
      console.error('delete lease failed', error);
      wx.showToast({
        title: '删除失败，请稍后重试',
        icon: 'none'
      });
    }
  },
  openRenewLeaseForm(event?: WechatMiniprogram.BaseEvent) {
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

    const baseEndDate = String(baseLease.actualEndDate || baseLease.endDate || '').slice(0, 10);
    const startDate = addDays(baseEndDate, 1);
    const endDate = addMonthsInclusive(startDate, 12);
    const feeRules = baseLease.feeRules ?? {};
    const rentAmount = Number(feeRules.rent?.amount ?? baseLease.rentAmount ?? 0);
    const managementAmount = feeRules.management?.cadence === 'once' ? 0 : Number(feeRules.management?.amount ?? 0);

    this.setData({
      renewDialogVisible: true,
      renewForm: {
        sourceLeaseId: String(baseLease.id || ''),
        startDate,
        endDate,
        rentAmount: rentAmount > 0 ? String(rentAmount) : '',
        managementAmount: managementAmount > 0 ? String(managementAmount) : '',
        customFeeItems: buildRenewCustomFeeDrafts(baseLease)
      }
    });
  },
  closeRenewDialog() {
    if (this.data.renewingLease) {
      return;
    }

    this.setData({
      renewDialogVisible: false
    });
  },
  handleRenewDateChange(event: WechatMiniprogram.PickerChange) {
    this.setData({
      renewForm: {
        ...this.data.renewForm,
        endDate: String(event.detail.value || '')
      }
    });
  },
  handleRenewInputChange(event: WechatMiniprogram.Input) {
    const field = event.currentTarget.dataset.field as 'rentAmount' | 'managementAmount';
    this.setData({
      renewForm: {
        ...this.data.renewForm,
        [field]: event.detail.value
      }
    });
  },
  addRenewCustomFeeItem() {
    const index = this.data.renewForm.customFeeItems.length + 1;
    this.setData({
      renewForm: {
        ...this.data.renewForm,
        customFeeItems: [
          ...this.data.renewForm.customFeeItems,
          {
            key: `renew_custom_${Date.now()}_${index}`,
            label: '',
            amount: ''
          }
        ]
      }
    });
  },
  removeRenewCustomFeeItem(event: WechatMiniprogram.BaseEvent) {
    const index = Number(event.currentTarget.dataset.index || 0);
    this.setData({
      renewForm: {
        ...this.data.renewForm,
        customFeeItems: this.data.renewForm.customFeeItems.filter((_, itemIndex) => itemIndex !== index)
      }
    });
  },
  handleRenewCustomFeeInput(event: WechatMiniprogram.Input) {
    const index = Number(event.currentTarget.dataset.index || 0);
    const field = event.currentTarget.dataset.field as 'label' | 'amount';
    const customFeeItems = this.data.renewForm.customFeeItems.slice();
    customFeeItems[index] = {
      ...customFeeItems[index],
      [field]: event.detail.value
    };
    this.setData({
      renewForm: {
        ...this.data.renewForm,
        customFeeItems
      }
    });
  },
  async confirmRenewLease() {
    if (this.data.renewingLease) {
      return;
    }

    const baseLease = resolveRenewBaseLeaseById(this.data.detail, this.data.renewForm.sourceLeaseId);
    const roomId = String(this.data.roomId || this.data.detail?.room?.id || '');
    const { startDate, endDate } = this.data.renewForm;

    if (!baseLease?.id || !roomId || !baseLease.tenantId) {
      wx.showToast({
        title: '当前无可续租的租约',
        icon: 'none'
      });
      return;
    }

    if (!endDate || endDate < startDate) {
      wx.showToast({
        title: '续租到期日不能早于开始日',
        icon: 'none'
      });
      return;
    }

    const renewFee = resolveRenewFeeRules(this.data.renewForm);
    if (!Number.isFinite(renewFee.rentAmount) || renewFee.rentAmount <= 0) {
      wx.showToast({
        title: '请填写有效租金',
        icon: 'none'
      });
      return;
    }

    this.setData({
      renewingLease: true
    });

    try {
      await saveLease({
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
        },
        renewFromLeaseId: String(baseLease.id || '')
      });
      wx.showToast({
        title: '续租成功',
        icon: 'success'
      });
      this.setData({
        renewDialogVisible: false
      });
      await this.loadDetail();
    } catch (error) {
      console.error('renew lease failed', error);
      wx.showToast({
        title: resolveLeaseSaveErrorMessage(error),
        icon: 'none'
      });
    } finally {
      this.setData({
        renewingLease: false
      });
    }
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
      const result = await endLease({ leaseId }) as {
        unpaidBillSummary?: { count: number; amount: number };
        unpaidBillOptions?: string[];
      };
      if ((result.unpaidBillSummary?.count ?? 0) > 0) {
        await wx.showModal({
          title: '未收账单处理',
          content: '当前仍有未收账单。可保留欠款、作废未收系统账单，或修改截止日期后重算。',
          showCancel: false
        });
      }
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
