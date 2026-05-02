const { deleteRoom, listRoomsByAsset, saveRoom } = require('../../services/room');

const ROOM_DELETE_BLOCKER_LABELS = {
  whole_unit_default: '默认整租单元不能删除',
  lease: '已有租约',
  bill: '已有账单',
  receipt: '已有收据',
  repair_record: '已有维修记录',
  owner_expense: '已有业主支出'
};

function formatDeleteBlockers(blockers = []) {
  return blockers
    .map((item) => {
      const label = ROOM_DELETE_BLOCKER_LABELS[item.code] || item.code;
      return item.count > 1 ? `${label} ${item.count} 条` : label;
    })
    .join('、');
}

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
  },
  async handleDeleteRoom(event) {
    const roomId = String(event.currentTarget.dataset.roomId || '');
    const roomName = String(event.currentTarget.dataset.roomName || '');

    if (!roomId) {
      return;
    }

    const checkResult = await deleteRoom({
      roomId,
      mode: 'check'
    });

    if (!checkResult.canDelete) {
      await wx.showModal({
        title: '不能删除房间',
        content: formatDeleteBlockers(checkResult.blockers) || '该房间已有业务记录，暂不能删除。',
        showCancel: false
      });
      return;
    }

    const confirmation = await wx.showModal({
      title: '删除房间',
      content: `确认删除“${roomName || roomId}”吗？删除后不可恢复。`,
      confirmText: '确认删除'
    });

    if (!confirmation.confirm) {
      return;
    }

    await deleteRoom({
      roomId,
      mode: 'delete',
      confirm: true
    });
    wx.showToast({
      title: '房间已删除',
      icon: 'success'
    });
    this.setData({
      message: '房间已删除'
    });

    if (this.data.assetId) {
      await this.loadRooms(this.data.assetId);
    }
  }
});
