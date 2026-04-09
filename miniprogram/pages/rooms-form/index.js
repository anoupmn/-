const { listRoomsByAsset, saveRoom } = require('../../services/room');

Page({
  data: {
    assetId: '',
    assetName: '',
    name: '',
    isWholeUnitDefault: false,
    message: '',
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
      wx.showToast({
        title: '缺少房源信息，请返回重试',
        icon: 'none'
      });
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
        message: '房间已保存'
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
  }
});
