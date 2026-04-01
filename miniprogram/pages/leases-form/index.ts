import { saveLease } from '../../services/lease';

Page({
  data: {
    roomId: '',
    tenantId: '',
    startDate: '',
    endDate: '',
    billingCycleDays: '',
    rentAmount: '',
    depositAmount: '',
    message: ''
  },
  handleInputChange(event: WechatMiniprogram.Input) {
    const field = event.currentTarget.dataset.field as string;
    this.setData({
      [field]: event.detail.value
    });
  },
  async handleSubmit() {
    await saveLease({
      lease: {
        roomId: this.data.roomId,
        tenantId: this.data.tenantId,
        startDate: this.data.startDate,
        endDate: this.data.endDate,
        billingCycleDays: Number(this.data.billingCycleDays || 30),
        rentAmount: Number(this.data.rentAmount || 0),
        depositAmount: Number(this.data.depositAmount || 0),
        note: ''
      }
    });
    this.setData({
      message: '租约已保存'
    });
  }
});
