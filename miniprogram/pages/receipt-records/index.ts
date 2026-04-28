import { listAssets } from '../../services/asset';
import { listRoomsByAsset } from '../../services/room';
import { listReceiptRecords } from '../../services/receipt';

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

Page({
  data: {
    month: currentMonthKey(),
    assetId: '',
    roomId: '',
    tenantId: '',
    status: 'all',
    receipts: [] as ReceiptRecord[],
    allReceipts: [] as ReceiptRecord[],
    loading: false,
    error: '',
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
    await Promise.all([this.loadFilterOptions(), this.loadReceipts()]);
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
        error: '收据记录加载失败，请稍后重试'
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
