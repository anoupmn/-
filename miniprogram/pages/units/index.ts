import { requireAuthSession } from '../../services/auth';
import { listAlertGroups } from '../../services/alert';
import {
  consumePendingUnitListDrilldownQuery,
  listRentableUnits,
  type UnitListDrilldownQuery
} from '../../services/rentable-unit';

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

function emptyDrilldownFilters(): UnitListDrilldownQuery {
  return {
    alertType: '',
    mainStatus: '',
    bucket: '',
    roomId: ''
  };
}

function parseQuery(query: Record<string, string>): UnitListDrilldownQuery {
  return {
    alertType: query.alertType || '',
    mainStatus: query.mainStatus || '',
    bucket: query.bucket || '',
    roomId: query.roomId || ''
  };
}

function hasDrilldownFilters(filters: UnitListDrilldownQuery) {
  return Boolean(filters.alertType || filters.mainStatus || filters.bucket || filters.roomId);
}

function buildPageTitle(filters: UnitListDrilldownQuery) {
  if (filters.roomId) {
    return '重点房间';
  }

  if (filters.alertType === 'expiring') {
    return '即将到期';
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

  return '房源列表';
}

function buildListHint(filters: UnitListDrilldownQuery) {
  if (hasDrilldownFilters(filters)) {
    return '这是从首页或提醒中心钻取过来的可操作列表，继续点进单元即可处理。';
  }

  return '先看主状态、风险标签和下一笔应收，快速扫一遍今天要处理的单元。';
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
    allUnits: [] as UnitSummary[],
    units: [] as UnitSummary[],
    visibleUnits: [] as UnitSummary[],
    unitSearchKeyword: '',
    unitListExpanded: false,
    listTitle: '房源列表',
    listHint: buildListHint(emptyDrilldownFilters()),
    drilldownFilters: emptyDrilldownFilters() as UnitListDrilldownQuery,
    alertRoomIds: [] as string[]
  },
  applyVisibleUnits(allUnits: UnitSummary[], unitSearchKeyword: string, unitListExpanded: boolean) {
    const narrowedUnits = allUnits.filter((unit) => matchesDrilldown(unit, this.data.drilldownFilters, this.data.alertRoomIds));
    const filteredUnits = filterUnits(narrowedUnits, unitSearchKeyword);

    this.setData({
      units: narrowedUnits,
      visibleUnits: unitListExpanded || unitSearchKeyword ? filteredUnits : filteredUnits.slice(0, 12)
    });
  },
  async loadUnits() {
    const allUnits = (await listRentableUnits()) as UnitSummary[];
    this.setData({
      allUnits
    });
    this.applyVisibleUnits(allUnits, this.data.unitSearchKeyword, this.data.unitListExpanded);
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
  async applyDrilldownFilters(filters: UnitListDrilldownQuery) {
    this.setData({
      drilldownFilters: filters,
      listTitle: buildPageTitle(filters),
      listHint: buildListHint(filters)
    });

    await this.loadAlertRoomIds();
    this.applyVisibleUnits(this.data.allUnits, this.data.unitSearchKeyword, this.data.unitListExpanded);
  },
  async onLoad(query: Record<string, string>) {
    await this.applyDrilldownFilters(parseQuery(query));
  },
  async onShow() {
    const session = await requireAuthSession();

    if (!session) {
      return;
    }

    const pendingFilters = consumePendingUnitListDrilldownQuery();
    if (pendingFilters) {
      this.setData({
        unitSearchKeyword: '',
        unitListExpanded: false
      });
      await this.applyDrilldownFilters(pendingFilters);
    }

    await this.loadUnits();
  },
  async onTabItemTap() {
    if (!hasDrilldownFilters(this.data.drilldownFilters)) {
      return;
    }

    this.setData({
      unitSearchKeyword: '',
      unitListExpanded: false
    });
    await this.applyDrilldownFilters(emptyDrilldownFilters());
    await this.loadUnits();
  },
  handleUnitSearch(event: WechatMiniprogram.Input) {
    const unitSearchKeyword = event.detail.value;

    this.setData({
      unitSearchKeyword,
      unitListExpanded: Boolean(unitSearchKeyword)
    });
    this.applyVisibleUnits(this.data.allUnits, unitSearchKeyword, Boolean(unitSearchKeyword));
  },
  toggleUnitList() {
    const unitListExpanded = !this.data.unitListExpanded;

    this.setData({
      unitListExpanded
    });
    this.applyVisibleUnits(this.data.allUnits, this.data.unitSearchKeyword, unitListExpanded);
  },
  openUnitDetail(event: WechatMiniprogram.BaseEvent) {
    const roomId = event.currentTarget.dataset.roomId as string;

    if (!roomId) {
      return;
    }

    wx.navigateTo({
      url: `/pages/unit-detail/index?roomId=${roomId}`
    });
  }
});
