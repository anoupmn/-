import { main as loginCloudFunction } from '../../cloudfunctions/login/index';
import {
  RZB_SESSION_KEY,
  bootstrapAuthSession,
  clearSession,
  loginAsLandlord
} from '../../miniprogram/services/auth';
import { getWXContext } from '../helpers/mock-cloud';
import { getMockWx } from '../helpers/mock-wx';

describe('auth service', () => {
  it('restores cached landlord session from storage', async () => {
    const mockWx = getMockWx();
    const cachedSession = {
      openid: 'openid-1',
      displayName: '张房东',
      role: 'landlord' as const,
      lastLoginAt: '2026-04-01T00:00:00.000Z'
    };

    mockWx.setStorageSync(RZB_SESSION_KEY, cachedSession);

    await expect(bootstrapAuthSession()).resolves.toEqual(cachedSession);
  });

  it('logs in through cloud function and persists the session', async () => {
    const mockWx = getMockWx();

    mockWx.__setCloudHandler(async ({ name, data }) => {
      expect(name).toBe('login');
      const result = await loginCloudFunction({
        displayName: String(data?.displayName ?? ''),
        __mockContext: {
          getWXContext: () => getWXContext('openid-2')
        }
      });

      return { result };
    });

    const session = await loginAsLandlord('李房东');

    expect(session.openid).toBe('openid-2');
    expect(session.displayName).toBe('李房东');
    expect(mockWx.__calls[0]).toEqual({
      name: 'login',
      data: {
        displayName: '李房东'
      }
    });
    expect(mockWx.getStorageSync(RZB_SESSION_KEY)).toEqual(session);
  });

  it('clears session from local storage', async () => {
    const mockWx = getMockWx();
    mockWx.setStorageSync(RZB_SESSION_KEY, { openid: 'openid-3' });

    await clearSession();

    expect(mockWx.getStorageSync(RZB_SESSION_KEY)).toBeUndefined();
  });
});
