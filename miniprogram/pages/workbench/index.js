const { bootstrapAuthSession } = require('../../services/auth');
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

const OVERVIEW_CARD_DEFS = [
  {
    key: 'overdue',
    label: '已逾期',
    unit: '条',
    desc: '需尽快处理',
    tone: 'overdue',
    query: { alertType: 'overdue' }
  },
  {
    key: 'expiring',
    label: '即将到期',
    unit: '条',
    desc: '3天内到期',
    tone: 'expiring',
    query: { alertType: 'expiring' }
  },
  {
    key: 'vacancy_long',
    label: '空置过久',
    unit: '套',
    desc: '超30天未出租',
    tone: 'vacancy',
    query: { alertType: 'vacancy_long' }
  },
  {
    key: 'manual_abnormal',
    label: '人工异常',
    unit: '条',
    desc: '需人工跟进',
    tone: 'manual',
    query: { alertType: 'manual_abnormal' }
  }
];

const ALERT_LABELS = {
  overdue: '已逾期',
  expiring: '即将到期',
  vacancy_long: '空置过久',
  manual_abnormal: '人工异常'
};
const GUEST_RECOMMENDATION = {
  type: 'login',
  label: '开始',
  title: '登录后添加房源并查看待处理事项',
  actionLabel: '去登录',
  actionQuery: {}
};
const GUEST_SUBSCRIPTION_STATE = {
  consentState: 'unknown',
  hasRequested: false,
  enabledRuleTypes: []
};

function getAlertTone(type) {
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

function inferAlertType(row) {
  const text = String(row.reasonLabel || '') + ' ' + String(row.primaryReason || '') + ' ' + String(row.supportingText || '');

  if (text.includes('逾期')) {
    return 'overdue';
  }

  if (text.includes('到期')) {
    return 'expiring';
  }

  if (text.includes('空置')) {
    return 'vacancy_long';
  }

  return 'manual_abnormal';
}

function normalizeOverviewCards(cards) {
  return OVERVIEW_CARD_DEFS.map((definition) => {
    const source = cards.find((item) => item.key === definition.key);
    const query = source && source.query ? source.query : definition.query;

    return {
      ...source,
      key: definition.key,
      label: definition.label,
      unit: definition.unit,
      desc: definition.desc,
      tone: definition.tone,
      count: source ? source.count : 0,
      query,
      url: buildUnitsUrl(query)
    };
  });
}

function trimRoomNamePrefix(row) {
  const supportingText = row.supportingText || row.primaryReason || '';
  const displayName = row.displayName || '';

  if (displayName && supportingText.startsWith(displayName)) {
    return supportingText.slice(displayName.length).trim();
  }

  return supportingText;
}

function normalizeAbnormalRows(rows) {
  return rows.map((item) => {
    const type = item.type || inferAlertType(item);

    return {
      ...item,
      tone: getAlertTone(type),
      reasonLabel: item.reasonLabel || ALERT_LABELS[type] || '待处理',
      supportingText: trimRoomNamePrefix(item),
      url: buildUnitsUrl(item.query)
    };
  });
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
        overviewCards: normalizeOverviewCards(payload.overviewCards),
        abnormalRows: normalizeAbnormalRows(payload.abnormalRows),
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
      this.setData({
        isLoggedIn: false,
        displayName: '',
        status: '可先浏览首页概览，登录后同步个人房源与提醒数据。',
        isLoading: false,
        loadFailed: false,
        overviewCards: normalizeOverviewCards([]),
        abnormalRows: [],
        recommendation: GUEST_RECOMMENDATION,
        recommendationUrl: '',
        subscriptionState: GUEST_SUBSCRIPTION_STATE
      });
      return;
    }

    this.setData({
      isLoggedIn: true,
      displayName: session.displayName
    });

    await this.loadDashboard();
  },
  ensureLoggedIn() {
    if (this.data.isLoggedIn) {
      return true;
    }

    wx.navigateTo({
      url: '/pages/auth/index'
    });
    return false;
  },
  handleLoginEntry() {
    this.ensureLoggedIn();
  },
  async onPullDownRefresh() {
    if (!this.data.isLoggedIn) {
      wx.stopPullDownRefresh();
      return;
    }

    await this.loadDashboard();
    wx.stopPullDownRefresh();
  },
  async handleReminderEntry() {
    if (!this.ensureLoggedIn()) {
      return;
    }

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
    if (!this.ensureLoggedIn()) {
      return;
    }

    const url = event.currentTarget.dataset.url;
    if (!url) {
      return;
    }
    wx.navigateTo({ url });
  },
  openUnitsByUrl(url) {
    if (!this.ensureLoggedIn()) {
      return;
    }

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
    if (!this.ensureLoggedIn()) {
      return;
    }

    if (!this.data.recommendationUrl) {
      return;
    }

    this.openUnitsByUrl(this.data.recommendationUrl);
  }
});
