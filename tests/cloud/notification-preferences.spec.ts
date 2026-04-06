import { main as getNotificationPreferencesMain } from '../../cloudfunctions/notification-preferences-get/index';
import { main as saveNotificationPreferencesMain } from '../../cloudfunctions/notification-preferences-save/index';
import { COLLECTIONS } from '../../cloudfunctions/shared/constants/collections';
import { createMockCloudContext, createMockDb, createMockStore } from '../helpers/mock-cloud';

describe('notification-preferences cloud functions', () => {
  it('creates preferences on first save with enabled rule types', async () => {
    const store = createMockStore();
    const eventBase = {
      __mockDb: createMockDb(store),
      __mockContext: createMockCloudContext('openid'),
      now: '2026-04-06T00:00:00.000Z'
    };

    const saved = await saveNotificationPreferencesMain({
      ...eventBase,
      consentState: 'accepted',
      hasRequested: true,
      enabledRuleTypes: ['expiring', 'overdue', 'manual_abnormal']
    });

    expect(saved.collectionName).toBe(COLLECTIONS.notificationPreferences);
    expect(saved.preference.hasRequested).toBe(true);
    expect(saved.preference.enabledRuleTypes).toEqual(['expiring', 'overdue', 'manual_abnormal']);
    expect(store.notificationPreferences).toHaveLength(1);
  });

  it('updates existing preferences and keeps manual_abnormal toggles', async () => {
    const store = createMockStore();
    store.notificationPreferences.push({
      id: 'pref_1',
      landlordOpenId: 'openid',
      consentState: 'accepted',
      hasRequested: true,
      enabledRuleTypes: ['expiring', 'overdue', 'vacancy_long', 'manual_abnormal'],
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-04-01T00:00:00.000Z'
    });

    const eventBase = {
      __mockDb: createMockDb(store),
      __mockContext: createMockCloudContext('openid'),
      now: '2026-04-06T01:00:00.000Z'
    };

    const saved = await saveNotificationPreferencesMain({
      ...eventBase,
      enabledRuleTypes: ['manual_abnormal', 'overdue']
    });

    expect(saved.preference.enabledRuleTypes).toEqual(['manual_abnormal', 'overdue']);
    expect(store.notificationPreferences[0]?.enabledRuleTypes).toEqual(['manual_abnormal', 'overdue']);
  });

  it('persists rejected consent state and can be fetched later', async () => {
    const store = createMockStore();
    const db = createMockDb(store);
    const mockContext = createMockCloudContext('openid');

    await saveNotificationPreferencesMain({
      __mockDb: db,
      __mockContext: mockContext,
      now: '2026-04-06T02:00:00.000Z',
      consentState: 'rejected',
      hasRequested: true,
      enabledRuleTypes: ['expiring', 'vacancy_long']
    });

    const fetched = await getNotificationPreferencesMain({
      __mockDb: db,
      __mockContext: mockContext,
      now: '2026-04-06T02:10:00.000Z'
    });

    expect(fetched.collectionName).toBe(COLLECTIONS.notificationPreferences);
    expect(fetched.preference.consentState).toBe('rejected');
    expect(fetched.preference.hasRequested).toBe(true);
    expect(fetched.preference.enabledRuleTypes).toEqual(['expiring', 'vacancy_long']);
  });
});
