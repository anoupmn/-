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
  }
});
