const {
  getNotificationPreferences,
  REMINDER_RULE_OPTIONS,
  saveNotificationPreferences
} = require('../../services/notification');

function buildRules(enabledRuleTypes) {
  const enabledSet = new Set(enabledRuleTypes || []);
  return REMINDER_RULE_OPTIONS.map((item) => ({
    key: item.key,
    label: item.label,
    enabled: enabledSet.has(item.key)
  }));
}

function getSubscriptionCopy(consentState, hasRequested) {
  if (!hasRequested) {
    return '你还没有完成提醒订阅授权，但可以先配置各类提醒开关。';
  }

  if (consentState === 'accepted') {
    return '已记录授权状态，可长期管理提醒类型开关。';
  }

  if (consentState === 'rejected') {
    return '已记录授权拒绝状态，你仍可调整规则开关并稍后重新授权。';
  }

  return '已记录授权状态，建议继续检查提醒规则开关。';
}

Page({
  data: {
    isLoading: true,
    isSaving: false,
    hasRequested: false,
    consentState: 'unknown',
    statusCopy: '',
    rules: []
  },
  async loadPreferences() {
    this.setData({ isLoading: true });

    try {
      const response = await getNotificationPreferences();
      const preference = response.preference;
      this.setData({
        isLoading: false,
        hasRequested: preference.hasRequested,
        consentState: preference.consentState,
        statusCopy: getSubscriptionCopy(preference.consentState, preference.hasRequested),
        rules: buildRules(preference.enabledRuleTypes)
      });
    } catch (error) {
      console.error('load reminder settings failed', error);
      this.setData({ isLoading: false });
      wx.showToast({
        title: '加载提醒设置失败，请稍后重试',
        icon: 'none'
      });
    }
  },
  async onShow() {
    await this.loadPreferences();
  },
  handleRuleToggle(event) {
    const key = event.currentTarget.dataset.key;
    const enabled = event.detail.value;

    this.setData({
      rules: this.data.rules.map((item) => (item.key === key ? { ...item, enabled } : item))
    });
  },
  async saveRules() {
    if (this.data.isSaving) {
      return;
    }

    const enabledRuleTypes = this.data.rules.filter((item) => item.enabled).map((item) => item.key);
    this.setData({ isSaving: true });

    try {
      const response = await saveNotificationPreferences({
        enabledRuleTypes,
        hasRequested: this.data.hasRequested,
        consentState: this.data.consentState
      });
      const preference = response.preference;
      this.setData({
        isSaving: false,
        hasRequested: preference.hasRequested,
        consentState: preference.consentState,
        statusCopy: getSubscriptionCopy(preference.consentState, preference.hasRequested),
        rules: buildRules(preference.enabledRuleTypes)
      });
      wx.showToast({
        title: '提醒设置已保存',
        icon: 'success'
      });
    } catch (error) {
      console.error('save reminder settings failed', error);
      this.setData({ isSaving: false });
      wx.showToast({
        title: '保存失败，请稍后再试',
        icon: 'none'
      });
    }
  }
});
