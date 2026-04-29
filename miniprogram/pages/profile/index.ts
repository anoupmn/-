import { clearSession, requireAuthSession } from '../../services/auth';

function maskOpenId(openid: string) {
  if (!openid) {
    return '';
  }

  if (openid.length <= 8) {
    return openid;
  }

  return `${openid.slice(0, 4)}****${openid.slice(-4)}`;
}

Page({
  data: {
    displayName: '',
    openidMasked: ''
  },
  async onShow() {
    const session = await requireAuthSession();
    if (!session) {
      return;
    }

    this.setData({
      displayName: session.displayName,
      openidMasked: maskOpenId(session.openid)
    });
  },
  async handleLogout() {
    await clearSession();
    await wx.reLaunch({
      url: '/pages/auth/index'
    });
  }
});
