import { getStorage, removeStorage, setStorage } from '../utils/storage';

export interface LandlordSession {
  openid: string;
  displayName: string;
  role: 'landlord';
  lastLoginAt: string;
}

export const RZB_SESSION_KEY = 'RZB_SESSION_KEY';
let isRedirectingToAuth = false;

export async function bootstrapAuthSession(): Promise<LandlordSession | null> {
  return getStorage<LandlordSession>(RZB_SESSION_KEY);
}

export async function requireAuthSession(): Promise<LandlordSession | null> {
  const session = await bootstrapAuthSession();
  if (!session) {
    const pages = getCurrentPages();
    const currentRoute = pages[pages.length - 1]?.route ?? '';

    if (currentRoute === 'pages/auth/index' || isRedirectingToAuth) {
      return null;
    }

    isRedirectingToAuth = true;
    try {
      await wx.reLaunch({
        url: '/pages/auth/index'
      });
    } finally {
      isRedirectingToAuth = false;
    }
    return null;
  }

  return session;
}

export async function loginAsLandlord(displayName = '用户'): Promise<LandlordSession> {
  const response = await wx.cloud.callFunction({
    name: 'login',
    data: {
      displayName
    }
  });
  const result = response.result as { session?: LandlordSession };

  if (!result.session) {
    throw new Error('登录结果缺少会话数据');
  }

  setStorage(RZB_SESSION_KEY, result.session);
  return result.session;
}

export async function clearSession() {
  removeStorage(RZB_SESSION_KEY);
}
