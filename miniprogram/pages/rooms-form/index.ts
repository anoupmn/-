import { saveRoom } from '../../services/room';

Page({
  data: {
    assetId: '',
    name: '',
    isWholeUnitDefault: false,
    message: ''
  },
  handleInputChange(event: WechatMiniprogram.Input) {
    const field = event.currentTarget.dataset.field as string;
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
      message: '房间已保存'
    });
  }
});
