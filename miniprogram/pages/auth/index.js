const { bootstrapAuthSession, loginAsLandlord } = require('../../services/auth');

Page({
  data: {
    loading: true,
    submitting: false,
    errorMessage: ''
  },
  async onLoad() {
    const session = await bootstrapAuthSession();

    if (session) {
      await wx.reLaunch({ url: '/pages/workbench/index' });
      return;
    }

    this.setData({
      loading: false
    });
  },
  async handleLogin() {
    this.setData({
      submitting: true,
      errorMessage: ''
    });

    try {
      await loginAsLandlord();
      await wx.reLaunch({ url: '/pages/workbench/index' });
    } catch (error) {
      this.setData({
        errorMessage: error && error.message ? error.message : '登录失败，请稍后重试',
        submitting: false
      });
      return;
    }

    this.setData({
      submitting: false
    });
  }
});
