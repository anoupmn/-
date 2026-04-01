import { endLease } from '../../services/lease';
import { getRentableUnitDetail } from '../../services/rentable-unit';

Page({
  data: {
    roomId: '',
    detail: null as Record<string, any> | null
  },
  async onLoad(query: Record<string, string>) {
    const roomId = query.roomId;
    const detail = (await getRentableUnitDetail({ roomId })) as Record<string, any>;
    this.setData({
      roomId,
      detail
    });
  },
  async handleEndLease() {
    const leaseId = this.data.detail?.activeLease?.id;
    if (!leaseId) {
      return;
    }

    await endLease({ leaseId });
    await wx.navigateBack();
  }
});
