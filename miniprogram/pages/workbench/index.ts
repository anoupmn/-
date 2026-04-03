import { bootstrapAuthSession, clearSession } from '../../services/auth';
import {
  getHomeDashboard,
  type DashboardAbnormalRow,
  type DashboardOverviewCard,
  type DashboardPayload,
  type DashboardRecommendation
} from '../../services/dashboard';
import { stringifyUnitListQuery } from '../../services/rentable-unit';

function buildUnitsUrl(query: Record<string, string>) {
  const queryString = stringifyUnitListQuery(query);
  return queryString ? `/pages/units/index?${queryString}` : '/pages/units/index';
}

Page({
  data: {
    isLoggedIn: false,
    displayName: '',
    status: '',
    isLoading: true,
    loadFailed: false,
    overviewCards: [] as DashboardOverviewCard[],
    abnormalRows: [] as DashboardAbnormalRow[],
    recommendation: null as DashboardRecommendation,
    subscriptionState: {
      hasRequested: false,
      enabledRuleTypes: [] as string[]
    }
  },
  async loadDashboard() {
    this.setData({
      isLoading: true,
      loadFailed: false
    });

    try {
      const payload = (await getHomeDashboard()) as DashboardPayload;
      const enabledCount = payload.subscriptionState.enabledRuleTypes.length;
      const status = payload.subscriptionState.hasRequested
        ? `已开启 ${enabledCount} 类提醒，继续按首页建议推进今天的处理顺序。`
        : '提醒尚未订阅，但首页盘面已可直接进入处理列表。';

      this.setData({
        status,
        isLoading: false,
        overviewCards: payload.overviewCards,
        abnormalRows: payload.abnormalRows,
        recommendation: payload.recommendation,
        subscriptionState: payload.subscriptionState
      });
    } catch (error) {
      console.error('load workbench dashboard failed', error);
      this.setData({
        isLoading: false,
        loadFailed: true
      });
      wx.showToast({
        title: '加载首页失败，请下拉重试或稍后再试。',
        icon: 'none'
      });
    }
  },
  async onShow() {
    const session = await bootstrapAuthSession();

    if (!session) {
      await wx.reLaunch({ url: '/pages/auth/index' });
      return;
    }

    this.setData({
      isLoggedIn: true,
      displayName: session.displayName
    });

    await this.loadDashboard();
  },
  async onPullDownRefresh() {
    if (!this.data.isLoggedIn) {
      return;
    }

    await this.loadDashboard();
    wx.stopPullDownRefresh();
  },
  async handleLogout() {
    await clearSession();
    await wx.reLaunch({ url: '/pages/auth/index' });
  },
  openQuickEntry() {
    wx.navigateTo({
      url: '/pages/quick-entry/index'
    });
  },
  navigateTo(event: WechatMiniprogram.BaseEvent) {
    const url = event.currentTarget.dataset.url as string;

    if (!url) {
      return;
    }

    wx.navigateTo({ url });
  },
  openOverviewCard(event: WechatMiniprogram.BaseEvent) {
    const query = event.currentTarget.dataset.query as Record<string, string>;

    wx.navigateTo({
      url: buildUnitsUrl(query)
    });
  },
  openAbnormalRow(event: WechatMiniprogram.BaseEvent) {
    const query = event.currentTarget.dataset.query as Record<string, string>;

    wx.navigateTo({
      url: buildUnitsUrl(query)
    });
  },
  openRecommendation() {
    const actionQuery = this.data.recommendation?.actionQuery;

    if (!actionQuery) {
      return;
    }

    wx.navigateTo({
      url: buildUnitsUrl(actionQuery)
    });
  }
});
