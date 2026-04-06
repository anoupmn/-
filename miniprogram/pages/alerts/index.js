const { requireAuthSession } = require('../../services/auth');
const { listAlertGroups } = require('../../services/alert');
const {
  parseUnitListUrl,
  setPendingUnitListDrilldownQuery,
  stringifyUnitListQuery
} = require('../../services/rentable-unit');

const GROUP_ORDER = ['overdue', 'expiring', 'vacancy_long', 'manual_abnormal'];

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
    .map((group, index) => ({
      ...group,
      collapsed: index > 1,
      listUrl: buildNavigationUrl('units', { alertType: group.type }),
      items: (group.items || []).map((item) => ({
        ...item,
        url: buildNavigationUrl(item.actionTarget.page, item.actionTarget.query)
      }))
    }));
}

function isUnitsUrl(url) {
  return String(url || '').indexOf('/pages/units/index') === 0;
}

Page({
  data: {
    isLoading: true,
    loadFailed: false,
    groups: []
  },
  async loadGroups() {
    this.setData({
      isLoading: true,
      loadFailed: false
    });

    try {
      const response = await listAlertGroups();
      this.setData({
        isLoading: false,
        groups: sortGroups(response.groups || [])
      });
    } catch (error) {
      console.error('load alert groups failed', error);
      this.setData({
        isLoading: false,
        loadFailed: true
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
