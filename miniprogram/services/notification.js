const { callCloudFunction } = require('./cloud');
const { SUBSCRIBE_TEMPLATE_IDS } = require('../config/notification');

const REMINDER_RULE_OPTIONS = [
  { key: 'expiring', label: '即将到期' },
  { key: 'overdue', label: '已逾期' },
  { key: 'vacancy_long', label: '空置过久' },
  { key: 'manual_abnormal', label: '人工异常' }
];

const SUBSCRIBE_TEMPLATE_CONFIG_ERROR = 'SUBSCRIBE_TEMPLATE_IDS_NOT_CONFIGURED';

function isPlaceholderTemplateId(templateId) {
  const normalized = String(templateId || '').toUpperCase();
  return normalized.includes('PENDING') || normalized.includes('PLACEHOLDER') || normalized.startsWith('PHASE');
}

function normalizeTemplateIds(templateIds) {
  return (templateIds || []).map((item) => String(item || '').trim()).filter(Boolean);
}

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
  const normalizedTemplateIds = normalizeTemplateIds(templateIds || SUBSCRIBE_TEMPLATE_IDS);
  if (!normalizedTemplateIds.length || normalizedTemplateIds.some((item) => isPlaceholderTemplateId(item))) {
    const error = new Error(SUBSCRIBE_TEMPLATE_CONFIG_ERROR);
    error.code = SUBSCRIBE_TEMPLATE_CONFIG_ERROR;
    throw error;
  }

  const result = await wx.requestSubscribeMessage({
    tmplIds: normalizedTemplateIds
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
  SUBSCRIBE_TEMPLATE_CONFIG_ERROR,
  getNotificationPreferences,
  saveNotificationPreferences,
  requestSubscribeMessage
};
