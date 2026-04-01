import { bootstrapAuthSession, clearSession } from '../../services/auth';

Page({
  data: {
    isLoggedIn: false,
    displayName: '',
    status: 'Phase 1 能力准备中'
  },
  async onShow() {
    const session = await bootstrapAuthSession();

    if (!session) {
      await wx.reLaunch({ url: '/pages/auth/index' });
      return;
    }

    this.setData({
      isLoggedIn: true,
      displayName: session.displayName,
      status: '已登录，后续会在这里接入录入与经营页面'
    });
  },
  async handleLogout() {
    await clearSession();
    await wx.reLaunch({ url: '/pages/auth/index' });
  },
  openQuickEntry() {
    wx.navigateTo({
      url: '/pages/quick-entry/index'
    });
  },
  openAssetsForm() {
    wx.navigateTo({
      url: '/pages/assets-form/index'
    });
  },
  openRoomsForm() {
    wx.navigateTo({
      url: '/pages/rooms-form/index'
    });
  },
  openTenantsForm() {
    wx.navigateTo({
      url: '/pages/tenants-form/index'
    });
  },
  openLeasesForm() {
    wx.navigateTo({
      url: '/pages/leases-form/index'
    });
  },
  openUnits() {
    wx.navigateTo({
      url: '/pages/units/index'
    });
  }
});
