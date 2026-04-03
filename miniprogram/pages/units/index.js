const { listRentableUnits } = require('../../services/rentable-unit');

function filterUnits(units, keyword) {
  const normalized = String(keyword || '').trim().toLowerCase();

  if (!normalized) {
    return units;
  }

  return units.filter((item) => {
    const text = [
      item.displayName,
      item.mainStatusLabel,
      item.currentTenantName,
      item.summaryHint,
      (item.riskTagLabels || []).join(' ')
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return text.indexOf(normalized) >= 0;
  });
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
    const localizedUnits = units || [];
    this.setData({
      units: localizedUnits
    });
    this.applyUnitFilter(localizedUnits, this.data.unitSearchKeyword, this.data.unitListExpanded);
  },
  handleUnitSearch(event) {
    const keyword = event.detail.value || '';
    const filtered = filterUnits(this.data.units, keyword);

    this.setData({
      unitSearchKeyword: keyword,
      unitListExpanded: !!keyword,
      visibleUnits: filtered
    });
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
    const filtered = filterUnits(units, keyword);

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
