import { listRentableUnits } from '../../services/rentable-unit';

Page({
  data: {
    units: [] as Array<Record<string, unknown>>
  },
  async onShow() {
    const units = (await listRentableUnits()) as Array<Record<string, unknown>>;
    this.setData({
      units
    });
  },
  openUnitDetail(event: WechatMiniprogram.BaseEvent) {
    const roomId = event.currentTarget.dataset.roomId as string;
    wx.navigateTo({
      url: `/pages/unit-detail/index?roomId=${roomId}`
    });
  }
});
