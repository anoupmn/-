const { listRentableUnits } = require('../../services/rentable-unit');

function toStatusLabel(status) {
  const statusMap = {
    occupied: '已出租',
    vacant: '空置',
    overdue: '已逾期',
    pending_move_in: '待入住'
  };

  return statusMap[status] || '未知状态';
}

Page({
  data: {
    units: [],
    visibleUnits: [],
    unitSearchKeyword: '',
    unitListExpanded: false
  },
  async onShow() {
    const units = await listRentableUnits();
    const localizedUnits = (units || []).map((item) => ({
      ...item,
      currentStatusLabel: toStatusLabel(item.currentStatus)
    }));
    this.setData({
      units: localizedUnits
    });
    this.applyUnitFilter(localizedUnits, this.data.unitSearchKeyword, this.data.unitListExpanded);
  },
  handleUnitSearch(event) {
    const keyword = event.detail.value || '';
    this.setData({
      unitSearchKeyword: keyword
    });
    this.applyUnitFilter(this.data.units, keyword, this.data.unitListExpanded);
  },
  toggleUnitList() {
    const nextExpanded = !this.data.unitListExpanded;
    this.setData({
      unitListExpanded: nextExpanded
    });
    this.applyUnitFilter(this.data.units, this.data.unitSearchKeyword, nextExpanded);
  },
  applyUnitFilter(units, keyword, expanded) {
    const normalized = String(keyword || '').trim().toLowerCase();
    const filtered = !normalized
      ? units
      : units.filter((item) => {
          const text = [
            item.displayName,
            item.currentStatusLabel,
            item.currentTenantName,
            item.nextReceivableDate
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return text.indexOf(normalized) >= 0;
        });

    this.setData({
      visibleUnits: expanded || normalized ? filtered : filtered.slice(0, 12)
    });
  },
  openUnitDetail(event) {
    const roomId = event.currentTarget.dataset.roomId;
    wx.navigateTo({
      url: '/pages/unit-detail/index?roomId=' + roomId
    });
  }
});
