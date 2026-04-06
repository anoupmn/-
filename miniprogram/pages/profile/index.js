const { clearSession, requireAuthSession } = require('../../services/auth');
const {
  getNotificationPreferences,
  REMINDER_RULE_OPTIONS,
  requestSubscribeMessage,
  SUBSCRIBE_TEMPLATE_CONFIG_ERROR
} = require('../../services/notification');

function maskOpenId(openid) {
  if (!openid) {
    return '';
  }

  if (openid.length <= 8) {
    return openid;
  }

  return openid.slice(0, 4) + '****' + openid.slice(-4);
}

function resolveStatusCopy(consentState, hasRequested) {
  if (!hasRequested) {
    return '你还没有完成提醒订阅授权，但可以先配置提醒规则开关。';
  }

  if (consentState === 'accepted') {
    return '已记录授权状态，你可以持续管理提醒规则。';
  }

  if (consentState === 'rejected') {
    return '已记录授权拒绝状态，你仍可调整规则后稍后重新授权。';
  }

  return '已记录授权结果，建议继续检查提醒规则开关。';
}

function isTemplateConfigError(error) {
  const payload = error || {};
  const message = String(payload.message || '') + ' ' + String(payload.errMsg || '');

  return (
    payload.code === SUBSCRIBE_TEMPLATE_CONFIG_ERROR ||
    payload.errCode === 20001 ||
    message.includes(SUBSCRIBE_TEMPLATE_CONFIG_ERROR) ||
    message.includes('No template data return')
  );
}

Page({
  data: {
    displayName: '',
    openidMasked: '',
    consentState: 'unknown',
    hasRequested: false,
    statusCopy: '',
    enabledRuleLabels: [],
    enabledRuleCopy: '未开启',
    isLoading: true
  },
  async loadProfile() {
    const session = await requireAuthSession();

    if (!session) {
      return;
    }

    this.setData({
      isLoading: true,
      displayName: session.displayName,
      openidMasked: maskOpenId(session.openid)
    });

    try {
      const response = await getNotificationPreferences();
      const preference = response.preference;
      const labelMap = new Map(REMINDER_RULE_OPTIONS.map((item) => [item.key, item.label]));
      const enabledRuleLabels = (preference.enabledRuleTypes || []).map((key) => labelMap.get(key) || key);

      this.setData({
        isLoading: false,
        hasRequested: preference.hasRequested,
        consentState: preference.consentState,
        statusCopy: resolveStatusCopy(preference.consentState, preference.hasRequested),
        enabledRuleLabels,
        enabledRuleCopy: enabledRuleLabels.length ? enabledRuleLabels.join('、') : '未开启'
      });
    } catch (error) {
      console.error('load profile notification state failed', error);
      this.setData({
        isLoading: false,
        statusCopy: '提醒状态加载失败，请稍后重试。',
        enabledRuleCopy: '未开启'
      });
      wx.showToast({
        title: '加载状态失败，请稍后重试',
        icon: 'none'
      });
    }
  },
  async onShow() {
    await this.loadProfile();
  },
  openReminderSettings() {
    wx.navigateTo({
      url: '/pages/reminder-settings/index'
    });
  },
  openAlertCenter() {
    wx.navigateTo({
      url: '/pages/alerts/index'
    });
  },
  async requestSubscription() {
    try {
      const result = await requestSubscribeMessage();
      wx.showToast({
        title: result.consentState === 'accepted' ? '已记录授权状态' : '已记录授权结果',
        icon: 'none'
      });
      await this.loadProfile();
    } catch (error) {
      console.error('request subscribe message from profile failed', error);
      if (isTemplateConfigError(error)) {
        wx.showModal({
          title: '先配置订阅模板',
          content: '当前订阅模板 ID 还是占位值。请先在 miniprogram/config/notification.js 中填入真实模板 ID，再发起授权。',
          showCancel: false
        });
        await this.loadProfile();
        return;
      }

      wx.showToast({
        title: '授权过程出现问题，请稍后重试',
        icon: 'none'
      });
      await this.loadProfile();
    }
  },
  async handleLogout() {
    await clearSession();
    await wx.reLaunch({
      url: '/pages/auth/index'
    });
  }
});
