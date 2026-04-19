const { requireAuthSession } = require('../../services/auth');
const { listAlertGroups } = require('../../services/alert');
const {
  parseUnitListUrl,
  setPendingUnitListDrilldownQuery,
  stringifyUnitListQuery
} = require('../../services/rentable-unit');

const GROUP_ORDER = ['overdue', 'expiring', 'vacancy_long', 'manual_abnormal'];
const GROUP_HELPER_TEXT = {
  overdue: '优先处理逾期项，避免账单继续积压。',
  expiring: '尽快确认续租或结束安排，减少空档。',
  vacancy_long: '空置时间较长，建议优先跟进出租。',
  manual_abnormal: '人工异常需要尽快核实并闭环处理。'
};

function resolveTone(type) {
  if (type === 'overdue') {
    return 'overdue';
  }

  if (type === 'expiring') {
    return 'expiring';
  }

  if (type === 'vacancy_long') {
    return 'vacancy';
  }

  return 'manual';
}

function buildNavigationUrl(page, query) {
  const queryString = stringifyUnitListQuery(query || {});

  if (page === 'unit-detail' && query && query.roomId) {
    return '/pages/unit-detail/index?roomId=' + encodeURIComponent(query.roomId);
  }

  return queryString ? '/pages/units/index?' + queryString : '/pages/units/index';
}

function sortGroups(groups) {
  return groups
    .slice()
    .sort((a, b) => GROUP_ORDER.indexOf(a.type) - GROUP_ORDER.indexOf(b.type))
    .map((group, index) => {
      const tone = resolveTone(group.type);
      const badgeClass = 'status-' + tone;

      return {
        ...group,
        collapsed: index > 1,
        tone,
        toneClass: 'tone-' + tone,
        badgeClass,
        helperText: GROUP_HELPER_TEXT[group.type] || '先处理最紧急提醒，再逐项清理。',
        listUrl: buildNavigationUrl('units', { alertType: group.type }),
        items: (group.items || []).map((item) => ({
          ...item,
          url: buildNavigationUrl(item.actionTarget.page, item.actionTarget.query),
          reasonClass: badgeClass
        }))
      };
    });
}

function isUnitsUrl(url) {
  return String(url || '').indexOf('/pages/units/index') === 0;
}

Page({
  data: {
    isLoading: true,
    loadFailed: false,
    groups: [],
    totalAlerts: 0
  },
  async loadGroups() {
    this.setData({
      isLoading: true,
      loadFailed: false
    });

    try {
      const response = await listAlertGroups();
      const groups = sortGroups(response.groups || []);
      this.setData({
        isLoading: false,
        groups,
        totalAlerts: groups.reduce((sum, group) => sum + group.items.length, 0)
      });
    } catch (error) {
      console.error('load alert groups failed', error);
      this.setData({
        isLoading: false,
        loadFailed: true,
        totalAlerts: 0
      });
      wx.showToast({
        title: '加载提醒失败，请稍后再试',
        icon: 'none'
      });
    }
  },
  async onShow() {
    const session = await requireAuthSession();

    if (!session) {
      return;
    }

    await this.loadGroups();
  },
  retryLoad() {
    this.loadGroups();
  },
  toggleGroup(event) {
    const type = event.currentTarget.dataset.type;

    this.setData({
      groups: this.data.groups.map((group) => (group.type === type ? { ...group, collapsed: !group.collapsed } : group))
    });
  },
  openUnitsByUrl(url) {
    setPendingUnitListDrilldownQuery(parseUnitListUrl(url));
    wx.switchTab({
      url: '/pages/units/index'
    });
  },
  navigateTo(event) {
    const url = event.currentTarget.dataset.url;
    if (!url) {
      return;
    }

    if (isUnitsUrl(url)) {
      this.openUnitsByUrl(url);
      return;
    }

    wx.navigateTo({
      url
    });
  }
});
