import { listAssets } from '../../services/asset';
import { saveLease } from '../../services/lease';
import { listRoomsByAsset } from '../../services/room';
import { saveTenant } from '../../services/tenant';

Page({
  data: {
    assets: [] as Array<Record<string, any>>,
    rooms: [] as Array<Record<string, any>>,
    assetIndex: 0,
    roomIndex: 0,
    billingCycleOptions: ['30 天', '31 天', '按月近似 28 天'],
    selectedAssetId: '',
    selectedRoomId: '',
    tenantName: '',
    tenantPhone: '',
    startDate: '2026-04-02',
    endDate: '2027-04-01',
    billingCycleDays: '30',
    rentAmount: '',
    depositAmount: '',
    message: '',
    roomHint: '请先选择房源'
  },
  async onShow() {
    await this.loadAssets();
  },
  async loadAssets() {
    const assets = (await listAssets()) as Array<Record<string, any>>;
    const firstAsset = assets[0] ?? null;

    this.setData({
      assets,
      assetIndex: 0,
      selectedAssetId: firstAsset?.id ?? '',
      rooms: [],
      roomIndex: 0,
      selectedRoomId: ''
    });

    if (firstAsset?.id) {
      await this.loadRooms(String(firstAsset.id));
    } else {
      this.setData({
        roomHint: '请先去房源维护录入房源'
      });
    }
  },
  async loadRooms(assetId: string) {
    const rooms = (await listRoomsByAsset(assetId)) as Array<Record<string, any>>;
    const firstRoom = rooms[0] ?? null;

    this.setData({
      rooms,
      roomIndex: 0,
      selectedRoomId: firstRoom?.id ?? '',
      roomHint: firstRoom ? '已加载该房源下的房间' : '该房源下还没有房间，请先在房源列表里添加房间'
    });
  },
  handleInputChange(event: WechatMiniprogram.Input) {
    const field = event.currentTarget.dataset.field as string;
    this.setData({
      [field]: event.detail.value
    });
  },
  async handleAssetChange(event: WechatMiniprogram.PickerChange) {
    const assetIndex = Number(event.detail.value || 0);
    const asset = this.data.assets[assetIndex] ?? null;

    this.setData({
      assetIndex,
      selectedAssetId: asset?.id ?? '',
      rooms: [],
      roomIndex: 0,
      selectedRoomId: ''
    });

    if (asset?.id) {
      await this.loadRooms(String(asset.id));
    }
  },
  handleRoomChange(event: WechatMiniprogram.PickerChange) {
    const roomIndex = Number(event.detail.value || 0);
    const room = this.data.rooms[roomIndex] ?? null;

    this.setData({
      roomIndex,
      selectedRoomId: room?.id ?? ''
    });
  },
  handleDateChange(event: WechatMiniprogram.PickerChange) {
    const field = event.currentTarget.dataset.field as string;
    this.setData({
      [field]: event.detail.value
    });
  },
  handleBillingCycleChange(event: WechatMiniprogram.PickerChange) {
    const optionIndex = Number(event.detail.value || 0);
    const cycleValues = ['30', '31', '28'];
    this.setData({
      billingCycleDays: cycleValues[optionIndex] ?? '30'
    });
  },
  async handleSubmit() {
    if (!this.data.selectedRoomId) {
      wx.showToast({
        title: '请先选择房间',
        icon: 'none'
      });
      return;
    }

    if (!this.data.tenantName) {
      wx.showToast({
        title: '请填写租户姓名',
        icon: 'none'
      });
      return;
    }

    const tenant = (await saveTenant({
      tenant: {
        name: this.data.tenantName,
        phone: this.data.tenantPhone,
        note: ''
      }
    })) as { id: string };

    await saveLease({
      lease: {
        roomId: this.data.selectedRoomId,
        tenantId: tenant.id,
        startDate: this.data.startDate,
        endDate: this.data.endDate,
        billingCycleDays: Number(this.data.billingCycleDays || 30),
        rentAmount: Number(this.data.rentAmount || 0),
        depositAmount: Number(this.data.depositAmount || 0),
        note: ''
      }
    });
    this.setData({
      tenantName: '',
      tenantPhone: '',
      startDate: '2026-04-02',
      endDate: '2027-04-01',
      billingCycleDays: '30',
      rentAmount: '',
      depositAmount: '',
      message: '租户与租约已保存'
    });
  }
});
