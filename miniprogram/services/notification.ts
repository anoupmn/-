import { callCloudFunction } from './cloud';

export const REMINDER_RULE_OPTIONS = [
  {
    key: 'expiring',
    label: '即将到期'
  },
  {
    key: 'overdue',
    label: '已逾期'
  },
  {
    key: 'vacancy_long',
    label: '空置过久'
  },
  {
    key: 'manual_abnormal',
    label: '人工异常'
  }
] as const;

export type ReminderRuleType = (typeof REMINDER_RULE_OPTIONS)[number]['key'];
export type ConsentState = 'unknown' | 'accepted' | 'rejected';

export type NotificationPreference = {
  id: string;
  landlordOpenId: string;
  consentState: ConsentState;
  hasRequested: boolean;
  enabledRuleTypes: ReminderRuleType[];
  createdAt: string;
  updatedAt: string;
};

type NotificationPreferenceResponse = {
  collectionName: string;
  preference: NotificationPreference;
};

const DEFAULT_SUBSCRIBE_TEMPLATE_IDS = ['PHASE5_TEMPLATE_PENDING'];

function extractConsentState(result: WechatMiniprogram.RequestSubscribeMessageSuccessCallbackResult): ConsentState {
  const decisions = Object.values(result);
  if (decisions.some((value) => value === 'accept')) {
    return 'accepted';
  }
  if (decisions.some((value) => value === 'reject' || value === 'ban')) {
    return 'rejected';
  }
  return 'unknown';
}

export function getNotificationPreferences() {
  return callCloudFunction<NotificationPreferenceResponse>('notification-preferences-get');
}

export function saveNotificationPreferences(payload: {
  consentState?: ConsentState;
  hasRequested?: boolean;
  enabledRuleTypes?: ReminderRuleType[];
}) {
  return callCloudFunction<NotificationPreferenceResponse>('notification-preferences-save', payload);
}

export async function requestSubscribeMessage(templateIds = DEFAULT_SUBSCRIBE_TEMPLATE_IDS) {
  const result = await wx.requestSubscribeMessage({
    tmplIds: templateIds
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
