const { RZB_SESSION_KEY } = require('./services/auth');

App({
  globalData: {
    session: null
  },
  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        env: wx.cloud.DYNAMIC_CURRENT_ENV,
        traceUser: true
      });
    }
  },
  onShow(options) {
    if (options.path === 'pages/auth/index') {
      return;
    }

    const session = wx.getStorageSync(RZB_SESSION_KEY);
    if (!session) {
      wx.reLaunch({
        url: '/pages/auth/index'
      });
    }
  }
});
