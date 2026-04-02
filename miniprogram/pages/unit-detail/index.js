const { endLease } = require('../../services/lease');
const { getRentableUnitDetail } = require('../../services/rentable-unit');

function toLeaseStatusLabel(lease) {
  if (!lease) {
    return '无';
  }

  if (lease.closedAt) {
    return '已结束';
  }

  const now = new Date();
  const start = new Date(String(lease.startDate) + 'T00:00:00');
  const end = new Date(String(lease.endDate) + 'T00:00:00');

  if (now < start) {
    return '待入住';
  }

  if (now > end) {
    return '已结束';
  }

  return '生效中';
}

Page({
  data: {
    roomId: '',
    detail: null
  },
  async onLoad(query) {
    const roomId = query.roomId;
    const detail = await getRentableUnitDetail({ roomId });
    const tenantsById = {};

    (detail.tenantHistory || []).forEach((tenant) => {
      tenantsById[tenant.id] = tenant.name;
    });

    const localizedDetail = detail ? {
      ...detail,
      activeLeaseLabel: detail.activeLease
        ? detail.activeLease.startDate + ' 至 ' + detail.activeLease.endDate
        : '无',
      leaseHistoryView: (detail.leaseHistory || []).map((lease) => ({
        id: lease.id,
        period: lease.startDate + ' 至 ' + lease.endDate,
        tenantName: tenantsById[lease.tenantId] || '未知租户',
        statusLabel: toLeaseStatusLabel(lease)
      }))
    } : null;

    this.setData({
      roomId,
      detail: localizedDetail || null
    });
  },
  async handleEndLease() {
    const leaseId = this.data.detail && this.data.detail.activeLease
      ? this.data.detail.activeLease.id
      : '';

    if (!leaseId) {
      return;
    }

    await endLease({ leaseId });
    await wx.navigateBack();
  }
});
