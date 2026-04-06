const { requireAuthSession } = require('../../services/auth');
const { getHomeDashboard } = require('../../services/dashboard');
const { requestSubscribeMessage, SUBSCRIBE_TEMPLATE_CONFIG_ERROR } = require('../../services/notification');
const {
  parseUnitListUrl,
  setPendingUnitListDrilldownQuery,
  stringifyUnitListQuery
} = require('../../services/rentable-unit');

function buildUnitsUrl(query) {
  const queryString = stringifyUnitListQuery(query);
  return queryString ? '/pages/units/index?' + queryString : '/pages/units/index';
}

function isTemplateConfigError(error) {
  const payload = error || {};
  const message = String(payload.message || '') + ' ' + String(payload.errMsg || '');
  return (
    payload.code === SUBSCRIBE_TEMPLATE_CONFIG_ERROR ||
    message.includes(SUBSCRIBE_TEMPLATE_CONFIG_ERROR) ||
    payload.errCode === 20001 ||
    message.includes('No template data return')
  );
}

Page({
  data: {
    isLoggedIn: false,
    displayName: '',
    status: '',
    isLoading: true,
    loadFailed: false,
    overviewCards: [],
    abnormalRows: [],
    recommendation: null,
    recommendationUrl: '',
    subscriptionState: {
      consentState: 'unknown',
      hasRequested: false,
      enabledRuleTypes: []
    }
  },
  async loadDashboard() {
    this.setData({
      isLoading: true,
      loadFailed: false
    });

    try {
      const payload = await getHomeDashboard();
      const enabledCount = payload.subscriptionState.enabledRuleTypes.length;
      const hasRequested = payload.subscriptionState.hasRequested;
      const consentState = payload.subscriptionState.consentState;
      const status = hasRequested
        ? consentState === 'accepted'
          ? '已记录授权状态，当前启用 ' + enabledCount + ' 类提醒规则。'
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
    const session = await requireAuthSession();

    if (!session) {
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
      if (isTemplateConfigError(error)) {
        wx.showModal({
          title: '先配置订阅模板',
          content: '当前订阅模板 ID 还是占位值。请先在 miniprogram/config/notification.js 中填入真实模板 ID，再点“开启提醒”。',
          showCancel: false
        });
        await this.loadDashboard();
        return;
      }

      wx.showToast({
        title: '授权过程出现问题，请稍后重试',
        icon: 'none'
      });
      await this.loadDashboard();
    }
  },
  navigateTo(event) {
    const url = event.currentTarget.dataset.url;
    if (!url) {
      return;
    }
    wx.navigateTo({ url });
  },
  openUnitsByUrl(url) {
    setPendingUnitListDrilldownQuery(parseUnitListUrl(url));
    wx.switchTab({
      url: '/pages/units/index'
    });
  },
  openOverviewCard(event) {
    const url = event.currentTarget.dataset.url;

    if (!url) {
      return;
    }

    this.openUnitsByUrl(url);
  },
  openAbnormalRow(event) {
    const url = event.currentTarget.dataset.url;

    if (!url) {
      return;
    }

    this.openUnitsByUrl(url);
  },
  openRecommendation() {
    if (!this.data.recommendationUrl) {
      return;
    }

    this.openUnitsByUrl(this.data.recommendationUrl);
  }
});
