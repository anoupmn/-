const { callCloudFunction } = require('./cloud');

const REMINDER_RULE_OPTIONS = [
  { key: 'expiring', label: '即将到期' },
  { key: 'overdue', label: '已逾期' },
  { key: 'vacancy_long', label: '空置过久' },
  { key: 'manual_abnormal', label: '人工异常' }
];

const DEFAULT_SUBSCRIBE_TEMPLATE_IDS = ['PHASE5_TEMPLATE_PENDING'];

function extractConsentState(result) {
  const decisions = Object.values(result || {});
  if (decisions.some((value) => value === 'accept')) {
    return 'accepted';
  }
  if (decisions.some((value) => value === 'reject' || value === 'ban')) {
    return 'rejected';
  }
  return 'unknown';
}

function getNotificationPreferences() {
  return callCloudFunction('notification-preferences-get');
}

function saveNotificationPreferences(payload) {
  return callCloudFunction('notification-preferences-save', payload);
}

async function requestSubscribeMessage(templateIds) {
  const result = await wx.requestSubscribeMessage({
    tmplIds: templateIds || DEFAULT_SUBSCRIBE_TEMPLATE_IDS
  });

  const consentState = extractConsentState(result);
  const saved = await saveNotificationPreferences({
    consentState,
    hasRequested: true
  });

  return {
    consentState,
    preference: saved.preference,
    rawResult: result
  };
}

module.exports = {
  REMINDER_RULE_OPTIONS,
  getNotificationPreferences,
  saveNotificationPreferences,
  requestSubscribeMessage
};
