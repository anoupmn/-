import { requireAuthSession } from '../../services/auth';
import { listAlertGroups, type AlertGroup } from '../../services/alert';
import {
  parseUnitListUrl,
  setPendingUnitListDrilldownQuery,
  stringifyUnitListQuery
} from '../../services/rentable-unit';

type AlertGroupView = AlertGroup & {
  collapsed: boolean;
  listUrl: string;
  tone: 'overdue' | 'expiring' | 'vacancy' | 'manual';
  toneClass: string;
  badgeClass: string;
  helperText: string;
  items: Array<
    AlertGroup['items'][number] & {
      url: string;
      reasonClass: string;
    }
  >;
};

const GROUP_ORDER = ['overdue', 'expiring', 'vacancy_long', 'manual_abnormal'];
const GROUP_HELPER_TEXT: Record<string, string> = {
  overdue: '优先处理逾期项，避免账单继续积压。',
  expiring: '尽快确认续租或结束安排，减少空档。',
  vacancy_long: '空置时间较长，建议优先跟进出租。',
  manual_abnormal: '人工异常需要尽快核实并闭环处理。'
};

function resolveTone(type: string): AlertGroupView['tone'] {
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

function sortGroups(groups: AlertGroup[]) {
  return groups
    .slice()
    .sort((a, b) => GROUP_ORDER.indexOf(a.type) - GROUP_ORDER.indexOf(b.type))
    .map((group, index) => {
      const tone = resolveTone(group.type);
      const badgeClass = `status-${tone}`;

      return {
        ...group,
        collapsed: index > 1,
        tone,
        toneClass: `tone-${tone}`,
        badgeClass,
        helperText: GROUP_HELPER_TEXT[group.type] ?? '先处理最紧急提醒，再逐项清理。',
        listUrl: buildNavigationUrl('units', { alertType: group.type }),
        items: group.items.map((item) => ({
          ...item,
          url: buildNavigationUrl(item.actionTarget.page, item.actionTarget.query),
          reasonClass: badgeClass
        }))
      };
    });
}

function buildNavigationUrl(page: 'units' | 'unit-detail', query: Record<string, string>) {
  const queryString = stringifyUnitListQuery(query);

  if (page === 'unit-detail' && query.roomId) {
    return `/pages/unit-detail/index?roomId=${encodeURIComponent(query.roomId)}`;
  }

  return queryString ? `/pages/units/index?${queryString}` : '/pages/units/index';
}

function isUnitsUrl(url: string) {
  return url.startsWith('/pages/units/index');
}

Page({
  data: {
    isLoading: true,
    loadFailed: false,
    groups: [] as AlertGroupView[],
    totalAlerts: 0
  },
  async loadGroups() {
    this.setData({
      isLoading: true,
      loadFailed: false
    });

    try {
      const response = await listAlertGroups();
      const groups = sortGroups(response.groups);
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
  toggleGroup(event: WechatMiniprogram.BaseEvent) {
    const type = event.currentTarget.dataset.type as string;

    this.setData({
      groups: this.data.groups.map((group) => (group.type === type ? { ...group, collapsed: !group.collapsed } : group))
    });
  },
  openUnitsByUrl(url: string) {
    setPendingUnitListDrilldownQuery(parseUnitListUrl(url));
    wx.switchTab({
      url: '/pages/units/index'
    });
  },
  navigateTo(event: WechatMiniprogram.BaseEvent) {
    const url = event.currentTarget.dataset.url as string;

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
