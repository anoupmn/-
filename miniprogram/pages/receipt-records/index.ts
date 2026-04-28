import { listAssets } from '../../services/asset';
import { listRoomsByAsset } from '../../services/room';
import { createReceipt, listReceiptLeaseOptions, listReceiptRecords } from '../../services/receipt';

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
  totalAmount: number;
  status: 'active' | 'voided';
  billCount: number;
  reissueFromReceiptId?: string | null;
};

type LeaseMonthOption = {
  month: string;
  monthLabel: string;
  billCount: number;
  totalAmount: number;
};

type ReceiptLeaseOption = {
  leaseId: string;
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

function uniqueTenantOptions(receipts: ReceiptRecord[]): Option[] {
  const map = new Map<string, string>();
  receipts.forEach((receipt) => {
    if (receipt.tenantId && receipt.tenantName) {
      map.set(String(receipt.tenantId), String(receipt.tenantName));
    }
  });
  return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
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
    status: 'all',
    receipts: [] as ReceiptRecord[],
    allReceipts: [] as ReceiptRecord[],
    receiptLeaseOptions: [] as ReceiptLeaseOption[],
    receiptMonthOptions: [] as LeaseMonthOption[],
    selectedReceiptLeaseIndex: 0,
    selectedReceiptMonthIndex: 0,
    selectedReceiptLeaseId: '',
    selectedReceiptMonth: '',
    creatingReceipt: false,
    loading: false,
    error: '',
    issueError: '',
    assetOptions: [{ label: '全部房源', value: '' }] as Option[],
    roomOptions: [{ label: '全部房间', value: '' }] as Option[],
    tenantOptions: [{ label: '全部租客', value: '' }] as Option[],
    statusOptions: [
      { label: '全部', value: 'all' },
      { label: '有效', value: 'active' },
      { label: '已作废', value: 'voided' }
    ] as Option[],
    selectedAssetIndex: 0,
    selectedRoomIndex: 0,
    selectedTenantIndex: 0,
    selectedStatusIndex: 0
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
    if (this.data.status) {
      filters.status = this.data.status;
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
      const receipts = result.receipts || [];
      this.setData({
        receipts,
        allReceipts: receipts,
        tenantOptions: [{ label: '全部租客', value: '' }, ...uniqueTenantOptions(receipts)],
        loading: false
      });
    } catch (error) {
      console.error('load receipt records failed', error);
      this.setData({
        receipts: [],
        loading: false,
        error: resolveReceiptCloudError(error, '收据记录加载失败，请稍后重试')
      });
    }
  },
  async loadReceiptLeaseOptions() {
    try {
      const result = await listReceiptLeaseOptions({}) as { leases?: ReceiptLeaseOption[] };
      const receiptLeaseOptions = result.leases || [];
      const firstLease = receiptLeaseOptions[0];
      const receiptMonthOptions = firstLease?.months || [];
      const firstMonth = receiptMonthOptions[0];
      this.setData({
        receiptLeaseOptions,
        receiptMonthOptions,
        selectedReceiptLeaseIndex: 0,
        selectedReceiptMonthIndex: 0,
        selectedReceiptLeaseId: firstLease?.leaseId || '',
        selectedReceiptMonth: firstMonth?.month || '',
        issueError: ''
      });
    } catch (error) {
      console.error('load receipt lease options failed', error);
      this.setData({
        receiptLeaseOptions: [],
        receiptMonthOptions: [],
        selectedReceiptLeaseId: '',
        selectedReceiptMonth: '',
        issueError: resolveReceiptCloudError(error, '可开收据月份加载失败，请稍后重试')
      });
    }
  },
  handleReceiptLeaseChange(event: WechatMiniprogram.PickerChange) {
    const selectedReceiptLeaseIndex = Number(event.detail.value || 0);
    const lease = this.data.receiptLeaseOptions[selectedReceiptLeaseIndex];
    const receiptMonthOptions = lease?.months || [];
    const firstMonth = receiptMonthOptions[0];
    this.setData({
      selectedReceiptLeaseIndex,
      receiptMonthOptions,
      selectedReceiptMonthIndex: 0,
      selectedReceiptLeaseId: lease?.leaseId || '',
      selectedReceiptMonth: firstMonth?.month || ''
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
  async handleStatusChange(event: WechatMiniprogram.PickerChange) {
    const selectedStatusIndex = Number(event.detail.value || 0);
    const status = this.data.statusOptions[selectedStatusIndex];
    this.setData({
      selectedStatusIndex,
      status: status?.value || 'all'
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
  }
});
