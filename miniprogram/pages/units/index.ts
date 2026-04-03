import { listAlertGroups } from '../../services/alert';
import { listRentableUnits, type UnitListDrilldownQuery } from '../../services/rentable-unit';

interface UnitSummary {
  roomId: string;
  displayName: string;
  mainStatus: string;
  mainStatusLabel: string;
  riskTagLabels: string[];
  currentTenantName: string;
  nextReceivableDate: string;
  nextReceivableAmount: number;
  summaryHint: string;
}

function parseQuery(query: Record<string, string>): UnitListDrilldownQuery {
  return {
    alertType: query.alertType || '',
    mainStatus: query.mainStatus || '',
    bucket: query.bucket || '',
    roomId: query.roomId || ''
  };
}

function buildPageTitle(filters: UnitListDrilldownQuery) {
  if (filters.roomId) {
    return '重点房间';
  }

  if (filters.alertType === 'expiring') {
    return '15 天内到期';
  }

  if (filters.alertType === 'overdue') {
    return '已逾期';
  }

  if (filters.alertType === 'vacancy_long') {
    return '空置过久';
  }

  if (filters.alertType === 'manual_abnormal') {
    return '人工异常';
  }

  if (filters.mainStatus === 'vacant') {
    return '当前空置';
  }

  if (filters.bucket === 'abnormal') {
    return '异常房间';
  }

  return '房屋列表';
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

function matchesDrilldown(unit: UnitSummary, filters: UnitListDrilldownQuery, alertRoomIds: string[]) {
  if (filters.roomId && unit.roomId !== filters.roomId) {
    return false;
  }

  if (filters.mainStatus && unit.mainStatus !== filters.mainStatus) {
    return false;
  }

  if (filters.alertType === 'expiring' && !unit.riskTagLabels.includes('即将到期')) {
    return false;
  }

  if (filters.alertType === 'overdue' && !unit.riskTagLabels.includes('已逾期')) {
    return false;
  }

  if (filters.alertType === 'vacancy_long' && !(unit.mainStatus === 'vacant' && unit.summaryHint.includes('已空置'))) {
    return false;
  }

  if (filters.alertType === 'manual_abnormal' && !unit.summaryHint.includes('人工')) {
    return alertRoomIds.includes(unit.roomId);
  }

  if (filters.bucket === 'abnormal' && !alertRoomIds.includes(unit.roomId) && !unit.riskTagLabels.includes('异常')) {
    return false;
  }

  return true;
}

Page({
  data: {
    units: [] as UnitSummary[],
    visibleUnits: [] as UnitSummary[],
    unitSearchKeyword: '',
    unitListExpanded: false,
    listTitle: '房屋列表',
    listHint: '先看主状态、风险标签和下一笔应收，快速扫一遍今天要处理的单元。',
    drilldownFilters: {} as UnitListDrilldownQuery,
    alertRoomIds: [] as string[]
  },
  applyVisibleUnits(units: UnitSummary[], unitSearchKeyword: string, unitListExpanded: boolean) {
    const narrowedUnits = units.filter((unit) => matchesDrilldown(unit, this.data.drilldownFilters, this.data.alertRoomIds));
    const filteredUnits = filterUnits(narrowedUnits, unitSearchKeyword);

    this.setData({
      units: narrowedUnits,
      visibleUnits: unitListExpanded || unitSearchKeyword ? filteredUnits : filteredUnits.slice(0, 12)
    });
  },
  async loadUnits() {
    const units = (await listRentableUnits()) as UnitSummary[];
    this.applyVisibleUnits(units, this.data.unitSearchKeyword, this.data.unitListExpanded);
  },
  async loadAlertRoomIds() {
    const needsAlertLookup = this.data.drilldownFilters.alertType === 'manual_abnormal' || this.data.drilldownFilters.bucket === 'abnormal';

    if (!needsAlertLookup) {
      this.setData({
        alertRoomIds: []
      });
      return;
    }

    const response = await listAlertGroups();
    const alertRoomIds = Array.from(
      new Set(
        response.groups
          .filter((group) =>
            this.data.drilldownFilters.alertType
              ? group.type === this.data.drilldownFilters.alertType
              : group.type !== 'expiring'
          )
          .flatMap((group) => group.items.map((item) => item.roomId))
      )
    );

    this.setData({
      alertRoomIds
    });
  },
  async onLoad(query: Record<string, string>) {
    const drilldownFilters = parseQuery(query);

    this.setData({
      drilldownFilters,
      listTitle: buildPageTitle(drilldownFilters),
      listHint:
        Object.values(drilldownFilters).some(Boolean)
          ? '这是从首页或提醒中心钻取过来的可操作列表，继续点进单元即可处理。'
          : '先看主状态、风险标签和下一笔应收，快速扫一遍今天要处理的单元。'
    });

    await this.loadAlertRoomIds();
  },
  async onShow() {
    await this.loadUnits();
  },
  handleUnitSearch(event: WechatMiniprogram.Input) {
    const unitSearchKeyword = event.detail.value;

    this.setData({
      unitSearchKeyword,
      unitListExpanded: Boolean(unitSearchKeyword)
    });
    this.applyVisibleUnits(this.data.units, unitSearchKeyword, Boolean(unitSearchKeyword));
  },
  toggleUnitList() {
    const unitListExpanded = !this.data.unitListExpanded;

    this.setData({
      unitListExpanded
    });
    this.applyVisibleUnits(this.data.units, this.data.unitSearchKeyword, unitListExpanded);
  },
  openUnitDetail(event: WechatMiniprogram.BaseEvent) {
    const roomId = event.currentTarget.dataset.roomId as string;
    wx.navigateTo({
      url: `/pages/unit-detail/index?roomId=${roomId}`
    });
  }
});
