const { getStorage, removeStorage, setStorage } = require('../utils/storage');

const RZB_SESSION_KEY = 'RZB_SESSION_KEY';
let isRedirectingToAuth = false;

async function bootstrapAuthSession() {
  return getStorage(RZB_SESSION_KEY);
}

async function requireAuthSession() {
  const session = await bootstrapAuthSession();
  if (!session) {
    const pages = getCurrentPages();
    const currentRoute = pages[pages.length - 1]?.route || '';

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

async function loginAsLandlord(displayName) {
  const response = await wx.cloud.callFunction({
    name: 'login',
    data: {
      displayName: displayName || '用户'
    }
  });
  const result = response.result || {};

  if (!result.session) {
    throw new Error('登录结果缺少会话数据');
  }

  setStorage(RZB_SESSION_KEY, result.session);
  return result.session;
}

async function clearSession() {
  removeStorage(RZB_SESSION_KEY);
}

module.exports = {
  RZB_SESSION_KEY,
  bootstrapAuthSession,
  requireAuthSession,
  loginAsLandlord,
  clearSession
};
