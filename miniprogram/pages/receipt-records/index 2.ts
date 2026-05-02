import { listAssets } from '../../services/asset';
import { listRoomsByAsset } from '../../services/room';
import { createReceipt, deleteReceipt, listReceiptLeaseOptions, listReceiptRecords } from '../../services/receipt';

type Option = {
  label: string;
  value: string;
};

type ReceiptRecord = Record<string, any> & {
  id: string;
  receiptNo: string;
  monthKey: string;
  assetId: string;
  roomId: string;
  tenantId: string;
  assetName: string;
  roomName: string;
  tenantName: string;
  receivedAt: string;
  displayReceivedAt?: string;
  displayCreatedAt?: string;
  totalAmount: number;
  billCount: number;
};

type ReceiptGroup = {
  month: string;
  monthLabel: string;
  count: number;
  totalAmount: number;
  receipts: ReceiptRecord[];
};

type LeaseMonthOption = {
  month: string;
  monthLabel: string;
  billCount: number;
  totalAmount: number;
};

type ReceiptLeaseOption = {
  leaseId: string;
  assetId: string;
  roomId: string;
  tenantId?: string;
  assetName?: string;
  roomName?: string;
  tenantName?: string;
  startDate?: string;
  endDate?: string;
  label: string;
  months: LeaseMonthOption[];
};

function currentMonthKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function asOptions(records: Array<Record<string, any>>, labelKey = 'name'): Option[] {
  return records
    .filter((record) => record?.id)
    .map((record) => ({
      label: String(record[labelKey] || '未命名'),
      value: String(record.id)
    }));
}

function formatDateTime(value: unknown) {
  const source = String(value || '').trim();
  if (!source) {
    return '';
  }

  const parsed = new Date(source);
  if (!Number.isNaN(parsed.getTime()) && /[T\s]\d{2}:\d{2}/.test(source)) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    const hour = String(parsed.getHours()).padStart(2, '0');
    const minute = String(parsed.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }

  return source.replace('T', ' ').replace(/\.\d{3}Z?$/, '').replace(/Z$/, '');
}

function normalizeReceiptRecords(receipts: ReceiptRecord[]) {
  return receipts.map((receipt) => ({
    ...receipt,
    displayReceivedAt: formatDateTime(receipt.receivedAt),
    displayCreatedAt: formatDateTime(receipt.createdAt)
  }));
}

function buildIssueLeaseLabel(lease: ReceiptLeaseOption) {
  const tenant = lease.tenantName || '未知租客';
  const period = lease.startDate && lease.endDate ? `${lease.startDate} 至 ${lease.endDate}` : '租约';
  return `${tenant} · ${period}`;
}

function uniqueIssueOptions(
  leases: ReceiptLeaseOption[],
  valueKey: 'assetId' | 'roomId',
  labelKey: 'assetName' | 'roomName'
): Option[] {
  const map = new Map<string, string>();
  leases.forEach((lease) => {
    const value = String(lease[valueKey] || '');
    if (value && !map.has(value)) {
      map.set(value, String(lease[labelKey] || '未命名'));
    }
  });
  return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
}

function buildIssueSelectionState(input: {
  leases: ReceiptLeaseOption[];
  assetId?: string;
  roomId?: string;
  leaseId?: string;
  month?: string;
}) {
  const issueAssetOptions = uniqueIssueOptions(input.leases, 'assetId', 'assetName');
  const selectedIssueAssetId = issueAssetOptions.some((option) => option.value === input.assetId)
    ? String(input.assetId)
    : String(issueAssetOptions[0]?.value || '');
  const assetLeases = input.leases.filter((lease) => String(lease.assetId || '') === selectedIssueAssetId);
  const issueRoomOptions = uniqueIssueOptions(assetLeases, 'roomId', 'roomName');
  const selectedIssueRoomId = issueRoomOptions.some((option) => option.value === input.roomId)
    ? String(input.roomId)
    : String(issueRoomOptions[0]?.value || '');
  const roomLeases = assetLeases.filter((lease) => String(lease.roomId || '') === selectedIssueRoomId);
  const selectedLease = roomLeases.find((lease) => lease.leaseId === input.leaseId) || roomLeases[0];
  const receiptMonthOptions = selectedLease?.months || [];
  const selectedMonth = receiptMonthOptions.some((month) => month.month === input.month)
    ? String(input.month)
    : String(receiptMonthOptions[0]?.month || '');

  return {
    issueAssetOptions,
    issueRoomOptions,
    issueLeaseOptions: roomLeases.map((lease) => ({
      label: buildIssueLeaseLabel(lease),
      value: lease.leaseId
    })),
    receiptMonthOptions,
    selectedIssueAssetIndex: Math.max(0, issueAssetOptions.findIndex((option) => option.value === selectedIssueAssetId)),
    selectedIssueRoomIndex: Math.max(0, issueRoomOptions.findIndex((option) => option.value === selectedIssueRoomId)),
    selectedReceiptLeaseIndex: Math.max(0, roomLeases.findIndex((lease) => lease.leaseId === selectedLease?.leaseId)),
    selectedReceiptMonthIndex: Math.max(0, receiptMonthOptions.findIndex((month) => month.month === selectedMonth)),
    selectedIssueAssetId,
    selectedIssueRoomId,
    selectedReceiptLeaseId: selectedLease?.leaseId || '',
    selectedReceiptMonth: selectedMonth
  };
}

function uniqueTenantOptions(receipts: ReceiptRecord[]): Option[] {
  const map = new Map<string, string>();
  receipts.forEach((receipt) => {
    if (receipt.tenantId && receipt.tenantName) {
      map.set(String(receipt.tenantId), String(receipt.tenantName));
    }
  });
  return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
}

function monthLabel(month: string) {
  const [year, value] = month.split('-');
  return year && value ? `${year}年${value}月` : month || '未分组';
}

function groupReceipts(receipts: ReceiptRecord[]): ReceiptGroup[] {
  const groups = receipts.reduce<Map<string, ReceiptRecord[]>>((acc, receipt) => {
    const month = receipt.monthKey || 'unknown';
    acc.set(month, [...(acc.get(month) ?? []), receipt]);
    return acc;
  }, new Map<string, ReceiptRecord[]>());

  return Array.from(groups.entries())
    .map(([month, groupReceipts]) => {
      const sortedReceipts = [...groupReceipts].sort((left, right) =>
        `${left.assetName}/${left.roomName}/${left.tenantName}`.localeCompare(`${right.assetName}/${right.roomName}/${right.tenantName}`) ||
        String(right.createdAt || '').localeCompare(String(left.createdAt || ''))
      );

      return {
        month,
        monthLabel: monthLabel(month),
        count: sortedReceipts.length,
        totalAmount: sortedReceipts.reduce((sum, receipt) => sum + Number(receipt.totalAmount || 0), 0),
        receipts: sortedReceipts
      };
    })
    .sort((left, right) => right.month.localeCompare(left.month));
}

function resolveReceiptCloudError(error: unknown, fallback: string) {
  const record = error as { message?: string; errMsg?: string };
  const raw = `${record?.message ?? ''} ${record?.errMsg ?? ''}`.toLowerCase();

  if (
    raw.includes('functionname parameter could not be found') ||
    raw.includes('function_not_found') ||
    raw.includes('function not found')
  ) {
    return '收据云函数未部署，请上传 receipt-list、receipt-lease-options、receipt-create';
  }

  if (raw.includes('already has an active receipt')) {
    return '该租约本月已开过收据，请刷新后查看本月收据';
  }

  return fallback;
}

Page({
  data: {
    month: currentMonthKey(),
    assetId: '',
    roomId: '',
    tenantId: '',
    receipts: [] as ReceiptRecord[],
    receiptGroups: [] as ReceiptGroup[],
    allReceipts: [] as ReceiptRecord[],
    receiptLeaseOptions: [] as ReceiptLeaseOption[],
    issueAssetOptions: [] as Option[],
    issueRoomOptions: [] as Option[],
    issueLeaseOptions: [] as Option[],
    receiptMonthOptions: [] as LeaseMonthOption[],
    selectedIssueAssetIndex: 0,
    selectedIssueRoomIndex: 0,
    selectedReceiptLeaseIndex: 0,
    selectedReceiptMonthIndex: 0,
    selectedIssueAssetId: '',
    selectedIssueRoomId: '',
    selectedReceiptLeaseId: '',
    selectedReceiptMonth: '',
    creatingReceipt: false,
    deletingReceiptId: '',
    loading: false,
    error: '',
    issueError: '',
    assetOptions: [{ label: '全部房源', value: '' }] as Option[],
    roomOptions: [{ label: '全部房间', value: '' }] as Option[],
    tenantOptions: [{ label: '全部租客', value: '' }] as Option[],
    selectedAssetIndex: 0,
    selectedRoomIndex: 0,
    selectedTenantIndex: 0
  },
  async onLoad() {
    await Promise.all([this.loadFilterOptions(), this.loadReceipts(), this.loadReceiptLeaseOptions()]);
  },
  async loadFilterOptions() {
    try {
      const assets = await listAssets() as Array<Record<string, any>>;
      this.setData({
        assetOptions: [{ label: '全部房源', value: '' }, ...asOptions(assets)]
      });
      await this.loadRoomsForAsset();
    } catch (error) {
      console.error('load receipt filter options failed', error);
    }
  },
  async loadRoomsForAsset() {
    if (!this.data.assetId) {
      this.setData({
        roomOptions: [{ label: '全部房间', value: '' }],
        selectedRoomIndex: 0,
        roomId: ''
      });
      return;
    }

    try {
      const rooms = await listRoomsByAsset(this.data.assetId) as Array<Record<string, any>>;
      this.setData({
        roomOptions: [{ label: '全部房间', value: '' }, ...asOptions(rooms)],
        selectedRoomIndex: 0,
        roomId: ''
      });
    } catch (error) {
      console.error('load receipt room options failed', error);
      this.setData({
        roomOptions: [{ label: '全部房间', value: '' }],
        selectedRoomIndex: 0,
        roomId: ''
      });
    }
  },
  buildFilters() {
    const filters: Record<string, string> = {};
    if (this.data.month) {
      filters.month = this.data.month;
    }
    if (this.data.assetId) {
      filters.assetId = this.data.assetId;
    }
    if (this.data.roomId) {
      filters.roomId = this.data.roomId;
    }
    if (this.data.tenantId) {
      filters.tenantId = this.data.tenantId;
    }
    return filters;
  },
  async loadReceipts() {
    this.setData({
      loading: true,
      error: ''
    });

    try {
      const result = await listReceiptRecords({ filters: this.buildFilters() }) as { receipts?: ReceiptRecord[] };
      const receipts = normalizeReceiptRecords(result.receipts || []);
      this.setData({
        receipts,
        receiptGroups: groupReceipts(receipts),
        allReceipts: receipts,
        tenantOptions: [{ label: '全部租客', value: '' }, ...uniqueTenantOptions(receipts)],
        loading: false
      });
    } catch (error) {
      console.error('load receipt records failed', error);
      this.setData({
        receipts: [],
        receiptGroups: [],
        loading: false,
        error: resolveReceiptCloudError(error, '收据管理加载失败，请稍后重试')
      });
    }
  },
  async loadReceiptLeaseOptions() {
    try {
      const result = await listReceiptLeaseOptions({}) as { leases?: ReceiptLeaseOption[] };
      const receiptLeaseOptions = result.leases || [];
      this.setData({
        receiptLeaseOptions,
        ...buildIssueSelectionState({ leases: receiptLeaseOptions }),
        issueError: ''
      });
    } catch (error) {
      console.error('load receipt lease options failed', error);
      this.setData({
        receiptLeaseOptions: [],
        issueAssetOptions: [],
        issueRoomOptions: [],
        issueLeaseOptions: [],
        receiptMonthOptions: [],
        selectedIssueAssetId: '',
        selectedIssueRoomId: '',
        selectedReceiptLeaseId: '',
        selectedReceiptMonth: '',
        issueError: resolveReceiptCloudError(error, '可开收据月份加载失败，请稍后重试')
      });
    }
  },
  handleIssueAssetChange(event: WechatMiniprogram.PickerChange) {
    const selectedIssueAssetIndex = Number(event.detail.value || 0);
    const asset = this.data.issueAssetOptions[selectedIssueAssetIndex];
    this.setData({
      ...buildIssueSelectionState({
        leases: this.data.receiptLeaseOptions,
        assetId: asset?.value || ''
      })
    });
  },
  handleIssueRoomChange(event: WechatMiniprogram.PickerChange) {
    const selectedIssueRoomIndex = Number(event.detail.value || 0);
    const room = this.data.issueRoomOptions[selectedIssueRoomIndex];
    this.setData({
      ...buildIssueSelectionState({
        leases: this.data.receiptLeaseOptions,
        assetId: this.data.selectedIssueAssetId,
        roomId: room?.value || ''
      })
    });
  },
  handleReceiptLeaseChange(event: WechatMiniprogram.PickerChange) {
    const selectedReceiptLeaseIndex = Number(event.detail.value || 0);
    const lease = this.data.issueLeaseOptions[selectedReceiptLeaseIndex];
    this.setData({
      ...buildIssueSelectionState({
        leases: this.data.receiptLeaseOptions,
        assetId: this.data.selectedIssueAssetId,
        roomId: this.data.selectedIssueRoomId,
        leaseId: lease?.value || ''
      })
    });
  },
  handleReceiptMonthChange(event: WechatMiniprogram.PickerChange) {
    const selectedReceiptMonthIndex = Number(event.detail.value || 0);
    const month = this.data.receiptMonthOptions[selectedReceiptMonthIndex];
    this.setData({
      selectedReceiptMonthIndex,
      selectedReceiptMonth: month?.month || ''
    });
  },
  async createReceiptForSelectedLease() {
    if (!this.data.selectedReceiptLeaseId || !this.data.selectedReceiptMonth || this.data.creatingReceipt) {
      wx.showToast({
        title: '请选择租约和月份',
        icon: 'none'
      });
      return;
    }

    this.setData({
      creatingReceipt: true,
      issueError: ''
    });

    try {
      const receipt = await createReceipt({
        leaseId: this.data.selectedReceiptLeaseId,
        month: this.data.selectedReceiptMonth
      }) as Record<string, any>;
      wx.showToast({
        title: '收据已生成',
        icon: 'success'
      });
      await Promise.all([this.loadReceipts(), this.loadReceiptLeaseOptions()]);
      wx.navigateTo({
        url: `/pages/receipt/index?receiptId=${receipt.id}`
      });
    } catch (error) {
      console.error('create receipt from lease failed', error);
      const message = resolveReceiptCloudError(error, '开具收据失败');
      this.setData({
        issueError: message
      });
      if (message.includes('已开过收据')) {
        await Promise.all([this.loadReceipts(), this.loadReceiptLeaseOptions()]);
      }
      wx.showToast({
        title: message,
        icon: 'none'
      });
    } finally {
      this.setData({
        creatingReceipt: false
      });
    }
  },
  async handleMonthChange(event: WechatMiniprogram.PickerChange) {
    this.setData({
      month: String(event.detail.value || '')
    });
    await this.loadReceipts();
  },
  async clearMonth() {
    this.setData({
      month: ''
    });
    await this.loadReceipts();
  },
  async handleAssetChange(event: WechatMiniprogram.PickerChange) {
    const selectedAssetIndex = Number(event.detail.value || 0);
    const asset = this.data.assetOptions[selectedAssetIndex];
    this.setData({
      selectedAssetIndex,
      assetId: asset?.value || '',
      selectedTenantIndex: 0,
      tenantId: ''
    });
    await this.loadRoomsForAsset();
    await this.loadReceipts();
  },
  async handleRoomChange(event: WechatMiniprogram.PickerChange) {
    const selectedRoomIndex = Number(event.detail.value || 0);
    const room = this.data.roomOptions[selectedRoomIndex];
    this.setData({
      selectedRoomIndex,
      roomId: room?.value || '',
      selectedTenantIndex: 0,
      tenantId: ''
    });
    await this.loadReceipts();
  },
  async handleTenantChange(event: WechatMiniprogram.PickerChange) {
    const selectedTenantIndex = Number(event.detail.value || 0);
    const tenant = this.data.tenantOptions[selectedTenantIndex];
    this.setData({
      selectedTenantIndex,
      tenantId: tenant?.value || ''
    });
    await this.loadReceipts();
  },
  openReceipt(event: WechatMiniprogram.BaseEvent) {
    const id = String(event.currentTarget.dataset.id || '');
    if (!id) {
      return;
    }
    wx.navigateTo({
      url: `/pages/receipt/index?receiptId=${id}`
    });
  },
  openRoom(event: WechatMiniprogram.BaseEvent) {
    const id = String(event.currentTarget.dataset.id || '');
    if (!id) {
      return;
    }
    wx.navigateTo({
      url: `/pages/unit-detail/index?roomId=${id}`
    });
  },
  async deleteReceiptRecord(event: WechatMiniprogram.BaseEvent) {
    const id = String(event.currentTarget.dataset.id || '');
    if (!id || this.data.deletingReceiptId) {
      return;
    }

    const confirmed = await wx.showModal({
      title: '删除收据',
      content: '删除后会解除对应账单的收据引用，该租约月份可重新开具。',
      confirmText: '删除',
      confirmColor: '#c0392b'
    });
    if (!confirmed.confirm) {
      return;
    }

    this.setData({
      deletingReceiptId: id
    });

    try {
      await deleteReceipt({ receiptId: id });
      wx.showToast({
        title: '已删除',
        icon: 'none'
      });
      await Promise.all([this.loadReceipts(), this.loadReceiptLeaseOptions()]);
    } catch (error) {
      console.error('delete receipt record failed', error);
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      });
    } finally {
      this.setData({
        deletingReceiptId: ''
      });
    }
  }
});
