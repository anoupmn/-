const { listAssets } = require('../../services/asset');
const { saveLease } = require('../../services/lease');
const { listRoomsByAsset } = require('../../services/room');
const { saveTenant } = require('../../services/tenant');

Page({
  data: {
    assets: [],
    rooms: [],
    roomIndex: 0,
    billingCycleOptions: ['30 天', '31 天', '按月近似 28 天'],
    assetSearchKeyword: '',
    visibleAssets: [],
    assetListExpanded: false,
    selectedAssetId: '',
    selectedAssetName: '',
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
    const assets = await listAssets();
    const nextAssets = assets || [];
    const firstAsset = nextAssets[0] || null;

    this.setData({
      assets: nextAssets,
      selectedAssetId: firstAsset ? firstAsset.id : '',
      selectedAssetName: firstAsset ? firstAsset.name : '',
      rooms: [],
      roomIndex: 0,
      selectedRoomId: ''
    });
    this.applyAssetFilter(nextAssets, this.data.assetSearchKeyword, this.data.assetListExpanded);

    if (firstAsset) {
      await this.loadRooms(firstAsset.id);
    } else {
      this.setData({
        roomHint: '请先去房源维护录入房源'
      });
    }
  },
  async loadRooms(assetId) {
    const rooms = await listRoomsByAsset(assetId);
    const nextRooms = rooms || [];
    const firstRoom = nextRooms[0] || null;

    this.setData({
      rooms: nextRooms,
      roomIndex: 0,
      selectedRoomId: firstRoom ? firstRoom.id : '',
      roomHint: firstRoom ? '已加载该房源下的房间' : '该房源下还没有房间，请先在房源列表里添加房间'
    });
  },
  handleInputChange(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({
      [field]: event.detail.value
    });
  },
  handleAssetSearch(event) {
    const keyword = event.detail.value || '';
    this.setData({
      assetSearchKeyword: keyword
    });
    this.applyAssetFilter(this.data.assets, keyword, this.data.assetListExpanded);
  },
  toggleAssetList() {
    const nextExpanded = !this.data.assetListExpanded;
    this.setData({
      assetListExpanded: nextExpanded
    });
    this.applyAssetFilter(this.data.assets, this.data.assetSearchKeyword, nextExpanded);
  },
  applyAssetFilter(assets, keyword, expanded) {
    const normalized = String(keyword || '').trim().toLowerCase();
    const filtered = !normalized
      ? assets
      : assets.filter((item) => {
          const text = [item.name, item.address, item.id].filter(Boolean).join(' ').toLowerCase();
          return text.indexOf(normalized) >= 0;
        });

    this.setData({
      visibleAssets: expanded || normalized ? filtered : filtered.slice(0, 8)
    });
  },
  async selectAsset(event) {
    const assetId = event.currentTarget.dataset.assetId;
    const assetName = event.currentTarget.dataset.assetName;

    this.setData({
      selectedAssetId: assetId,
      selectedAssetName: assetName,
      rooms: [],
      roomIndex: 0,
      selectedRoomId: ''
    });

    await this.loadRooms(assetId);
  },
  handleRoomChange(event) {
    const roomIndex = Number(event.detail.value || 0);
    const room = this.data.rooms[roomIndex] || null;

    this.setData({
      roomIndex,
      selectedRoomId: room ? room.id : ''
    });
  },
  handleDateChange(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({
      [field]: event.detail.value
    });
  },
  handleBillingCycleChange(event) {
    const optionIndex = Number(event.detail.value || 0);
    const cycleValues = ['30', '31', '28'];
    this.setData({
      billingCycleDays: cycleValues[optionIndex] || '30'
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

    const tenant = await saveTenant({
      tenant: {
        name: this.data.tenantName,
        phone: this.data.tenantPhone,
        note: ''
      }
    });

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
