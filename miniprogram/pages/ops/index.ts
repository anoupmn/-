import { requireAuthSession } from '../../services/auth';

Page({
  data: {
    displayName: ''
  },
  async onShow() {
    const session = await requireAuthSession();

    if (!session) {
      return;
    }

    this.setData({
      displayName: session.displayName
    });
  },
  navigateTo(event: WechatMiniprogram.BaseEvent) {
    const url = event.currentTarget.dataset.url as string;

    if (!url) {
      return;
    }

    wx.navigateTo({
      url
    });
  },
  openUnitsTab() {
    wx.switchTab({
      url: '/pages/units/index'
    });
  }
});
