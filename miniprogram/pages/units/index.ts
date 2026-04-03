import { listRentableUnits } from '../../services/rentable-unit';

interface UnitSummary {
  roomId: string;
  displayName: string;
  mainStatusLabel: string;
  riskTagLabels: string[];
  currentTenantName: string;
  nextReceivableDate: string;
  nextReceivableAmount: number;
  summaryHint: string;
}

function filterUnits(units: UnitSummary[], keyword: string) {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) {
    return units;
  }

  return units.filter((unit) =>
    [
      unit.displayName,
      unit.mainStatusLabel,
      unit.currentTenantName,
      unit.summaryHint,
      unit.riskTagLabels.join(' ')
    ]
      .join(' ')
      .toLowerCase()
      .includes(normalizedKeyword)
  );
}

Page({
  data: {
    units: [] as UnitSummary[],
    visibleUnits: [] as UnitSummary[],
    unitSearchKeyword: '',
    unitListExpanded: false
  },
  async loadUnits() {
    const units = (await listRentableUnits()) as UnitSummary[];
    const visibleUnits = filterUnits(units, this.data.unitSearchKeyword).slice(
      0,
      this.data.unitListExpanded || this.data.unitSearchKeyword ? units.length : 12
    );

    this.setData({
      units,
      visibleUnits
    });
  },
  async onShow() {
    await this.loadUnits();
  },
  handleUnitSearch(event: WechatMiniprogram.Input) {
    const unitSearchKeyword = event.detail.value;
    const filteredUnits = filterUnits(this.data.units, unitSearchKeyword);

    this.setData({
      unitSearchKeyword,
      visibleUnits: filteredUnits,
      unitListExpanded: Boolean(unitSearchKeyword)
    });
  },
  toggleUnitList() {
    const unitListExpanded = !this.data.unitListExpanded;
    const filteredUnits = filterUnits(this.data.units, this.data.unitSearchKeyword);

    this.setData({
      unitListExpanded,
      visibleUnits: unitListExpanded ? filteredUnits : filteredUnits.slice(0, 12)
    });
  },
  openUnitDetail(event: WechatMiniprogram.BaseEvent) {
    const roomId = event.currentTarget.dataset.roomId as string;
    wx.navigateTo({
      url: `/pages/unit-detail/index?roomId=${roomId}`
    });
  }
});
