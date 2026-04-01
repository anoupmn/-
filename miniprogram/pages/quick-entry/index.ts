import { submitQuickEntry } from '../../services/quick-entry';

Page({
  data: {
    rentalMode: 'whole',
    assetName: '',
    address: '',
    roomName: '',
    tenantName: '',
    startDate: '',
    endDate: '',
    billingCycleDays: '30',
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
  handleRentalModeChange(event: WechatMiniprogram.PickerChange) {
    this.setData({
      rentalMode: event.detail.value === '0' ? 'whole' : 'room'
    });
  },
  async handleSubmit() {
    const payload = {
      mode: 'quick-entry' as const,
      asset: {
        name: this.data.assetName,
        rentalMode: this.data.rentalMode,
        address: this.data.address,
        note: ''
      },
      rooms:
        this.data.rentalMode === 'room'
          ? [
              {
                assetId: '',
                name: this.data.roomName || '房间 1',
                note: '',
                isWholeUnitDefault: false
              }
            ]
          : [],
      tenant: {
        name: this.data.tenantName,
        phone: '',
        note: ''
      },
      lease: {
        startDate: this.data.startDate,
        endDate: this.data.endDate,
        billingCycleDays: Number(this.data.billingCycleDays || 30),
        rentAmount: Number(this.data.rentAmount || 0),
        depositAmount: Number(this.data.depositAmount || 0),
        note: ''
      }
    };

    await submitQuickEntry(payload);
    this.setData({
      message: '快速录入已提交'
    });
  }
});
