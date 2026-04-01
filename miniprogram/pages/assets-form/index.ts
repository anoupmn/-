import { saveAsset } from '../../services/asset';

Page({
  data: {
    name: '',
    address: '',
    rentalMode: 'whole',
    message: ''
  },
  handleInputChange(event: WechatMiniprogram.Input) {
    const field = event.currentTarget.dataset.field as string;
    this.setData({
      [field]: event.detail.value
    });
  },
  handleRentalModeChange(event: WechatMiniprogram.PickerChange) {
    this.setData({
      rentalMode: event.detail.value === '0' ? 'whole' : 'room'
    });
  },
  async handleSubmit() {
    await saveAsset({
      asset: {
        name: this.data.name,
        address: this.data.address,
        rentalMode: this.data.rentalMode,
        note: ''
      }
    });
    this.setData({
      message: '房源已保存'
    });
  }
});
