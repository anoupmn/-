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
    await saveRoom({
      room: {
        assetId: this.data.assetId,
        name: this.data.name,
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
  }
});
