const { listRoomsByAsset, saveRoom } = require('../../services/room');

Page({
  data: {
    assetId: '',
    assetName: '',
    name: '',
    isWholeUnitDefault: false,
    message: '',
    showNextStep: false,
    rooms: []
  },
  async onLoad(query) {
    const assetId = query.assetId || '';
    const assetName = query.assetName ? decodeURIComponent(query.assetName) : '';
    this.setData({
      assetId,
      assetName
    });

    if (assetId) {
      await this.loadRooms(assetId);
    }
  },
  async loadRooms(assetId) {
    const rooms = await listRoomsByAsset(assetId);
    this.setData({
      rooms: rooms || []
    });
  },
  handleInputChange(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({
      [field]: event.detail.value
    });
  },
  async handleSubmit() {
    if (!String(this.data.assetId || '').trim()) {
      const action = await wx.showModal({
        title: '缺少房源信息',
        content: '当前页面缺少房源上下文，建议先返回房源维护页重新进入。',
        confirmText: '去房源维护',
        cancelText: '取消'
      });

      if (action.confirm) {
        wx.navigateTo({
          url: '/pages/assets-form/index'
        });
      }
      return;
    }

    if (!String(this.data.name || '').trim()) {
      wx.showToast({
        title: '请填写房间名称',
        icon: 'none'
      });
      return;
    }

    try {
      await saveRoom({
        room: {
          assetId: this.data.assetId,
          name: String(this.data.name || '').trim(),
          note: '',
          isWholeUnitDefault: this.data.isWholeUnitDefault
        }
      });
      this.setData({
        name: '',
        message: '房间已保存。下一步建议去录入租约。',
        showNextStep: true
      });

      if (this.data.assetId) {
        await this.loadRooms(this.data.assetId);
      }
    } catch (error) {
      console.error('save room failed', error);
      wx.showToast({
        title: '保存房间失败，请稍后重试',
        icon: 'none'
      });
    }
  },
  openLeaseForm() {
    const assetId = String(this.data.assetId || '');
    const assetName = String(this.data.assetName || '');
    const query = assetId
      ? '?assetId=' + encodeURIComponent(assetId) + '&assetName=' + encodeURIComponent(assetName)
      : '';

    wx.navigateTo({
      url: '/pages/leases-form/index' + query
    });
  }
});
