const { saveTenant } = require('../../services/tenant');

Page({
  data: {
    name: '',
    phone: '',
    message: ''
  },
  handleInputChange(event) {
    const field = event.currentTarget.dataset.field;
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
