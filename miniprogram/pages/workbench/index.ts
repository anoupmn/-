import { bootstrapAuthSession, clearSession } from '../../services/auth';
import {
  getHomeDashboard,
  type DashboardAbnormalRow,
  type DashboardOverviewCard,
  type DashboardPayload,
  type DashboardRecommendation
} from '../../services/dashboard';
import { requestSubscribeMessage } from '../../services/notification';
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
    recommendationUrl: '',
    subscriptionState: {
      consentState: 'unknown' as 'unknown' | 'accepted' | 'rejected',
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
      const { hasRequested, consentState } = payload.subscriptionState;
      const status = hasRequested
        ? consentState === 'accepted'
          ? `已记录授权状态，当前启用 ${enabledCount} 类提醒规则。`
          : '已记录授权状态，可在提醒设置中调整规则并稍后重新授权。'
        : '提醒尚未订阅，但首页盘面已可直接进入处理列表。';

      this.setData({
        status,
        isLoading: false,
        overviewCards: payload.overviewCards.map((item) => ({
          ...item,
          url: buildUnitsUrl(item.query)
        })),
        abnormalRows: payload.abnormalRows.map((item) => ({
          ...item,
          url: buildUnitsUrl(item.query)
        })),
        recommendation: payload.recommendation,
        recommendationUrl: payload.recommendation ? buildUnitsUrl(payload.recommendation.actionQuery) : '',
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
  async handleReminderEntry() {
    if (this.data.subscriptionState.hasRequested) {
      wx.navigateTo({
        url: '/pages/reminder-settings/index'
      });
      return;
    }

    try {
      const result = await requestSubscribeMessage();
      wx.showToast({
        title: result.consentState === 'accepted' ? '已记录授权状态' : '已记录授权结果',
        icon: 'none'
      });
      await this.loadDashboard();
    } catch (error) {
      console.error('request subscribe message failed', error);
      wx.showToast({
        title: '授权过程出现问题，请稍后重试',
        icon: 'none'
      });
      await this.loadDashboard();
    }
  },
  navigateTo(event: WechatMiniprogram.BaseEvent) {
    const url = event.currentTarget.dataset.url as string;

    if (!url) {
      return;
    }

    wx.navigateTo({ url });
  },
  openOverviewCard(event: WechatMiniprogram.BaseEvent) {
    const url = event.currentTarget.dataset.url as string;

    wx.navigateTo({
      url
    });
  },
  openAbnormalRow(event: WechatMiniprogram.BaseEvent) {
    const url = event.currentTarget.dataset.url as string;

    wx.navigateTo({
      url
    });
  },
  openRecommendation() {
    if (!this.data.recommendationUrl) {
      return;
    }

    wx.navigateTo({
      url: this.data.recommendationUrl
    });
  }
});
