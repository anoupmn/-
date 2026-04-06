import { RZB_SESSION_KEY } from './services/auth';

App<IAppOption>({
  globalData: {
    session: null
  },
  onLaunch() {
    if (wx.cloud) {
      const cloudApi = wx.cloud as typeof wx.cloud & {
        DYNAMIC_CURRENT_ENV?: string;
      };
      wx.cloud.init({
        env: cloudApi.DYNAMIC_CURRENT_ENV,
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
