const { requireAuthSession } = require('../../services/auth');
const { setPendingUnitListDrilldownQuery } = require('../../services/rentable-unit');

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
  navigateTo(event) {
    const url = event.currentTarget.dataset.url;

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
  },
  openAssetsForm() {
    wx.navigateTo({
      url: '/pages/assets-form/index'
    });
  },
  openLeasesForm() {
    wx.navigateTo({
      url: '/pages/leases-form/index'
    });
  },
  openLeaseList() {
    setPendingUnitListDrilldownQuery({
      mainStatus: 'occupied'
    });

    wx.switchTab({
      url: '/pages/units/index'
    });
  },
  openRoomsGuide() {
    wx.navigateTo({
      url: '/pages/assets-form/index'
    });
  }
});
