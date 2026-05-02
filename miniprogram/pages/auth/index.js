const { bootstrapAuthSession, loginAsLandlord } = require('../../services/auth');

function resolveLoginErrorMessage(error) {
  return (error && error.message) || '登录失败，请稍后重试';
}

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
    if (this.data.loading || this.data.submitting) {
      return;
    }

    this.setData({
      submitting: true,
      errorMessage: ''
    });

    try {
      await loginAsLandlord();
      await wx.reLaunch({ url: '/pages/workbench/index' });
    } catch (error) {
      this.setData({
        errorMessage: resolveLoginErrorMessage(error),
        submitting: false
      });
      return;
    }

    this.setData({
      submitting: false
    });
  }
});
