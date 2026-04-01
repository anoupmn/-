import { saveTenant } from '../../services/tenant';

Page({
  data: {
    name: '',
    phone: '',
    message: ''
  },
  handleInputChange(event: WechatMiniprogram.Input) {
    const field = event.currentTarget.dataset.field as string;
    this.setData({
      [field]: event.detail.value
    });
  },
  async handleSubmit() {
    await saveTenant({
      tenant: {
        name: this.data.name,
        phone: this.data.phone,
        note: ''
      }
    });
    this.setData({
      message: '租户已保存'
    });
  }
});
