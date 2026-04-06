const { getStorage, removeStorage, setStorage } = require('../utils/storage');

const RZB_SESSION_KEY = 'RZB_SESSION_KEY';

async function bootstrapAuthSession() {
  return getStorage(RZB_SESSION_KEY);
}

async function requireAuthSession() {
  const session = await bootstrapAuthSession();
  if (!session) {
    await wx.reLaunch({
      url: '/pages/auth/index'
    });
    return null;
  }

  return session;
}

async function loginAsLandlord(displayName) {
  const response = await wx.cloud.callFunction({
    name: 'login',
    data: {
      displayName: displayName || '房东'
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
