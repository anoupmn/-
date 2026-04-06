import { bootstrapAuthSession, loginAsLandlord } from '../../services/auth';

function resolveLoginDisplayName() {
  return new Promise<string>((resolve, reject) => {
    if (typeof wx.getUserProfile !== 'function') {
      resolve('用户');
      return;
    }

    wx.getUserProfile({
      desc: '用于设置你的登录用户名',
      success: (result) => {
        const displayName = String(result.userInfo?.nickName || '').trim();
        resolve(displayName || '用户');
      },
      fail: (error) => {
        reject(error);
      }
    });
  });
}

function resolveLoginErrorMessage(error: unknown) {
  const payload = error as { message?: string; errMsg?: string } | undefined;
  const rawMessage = `${payload?.message ?? ''} ${payload?.errMsg ?? ''}`.toLowerCase();

  if (rawMessage.includes('auth deny') || rawMessage.includes('authorize deny')) {
    return '需要同意微信昵称授权后才能登录';
  }

  return payload?.message || '登录失败，请稍后重试';
}

Page({
  data: {
    loading: true,
    submitting: false,
    errorMessage: ''
  },
  async onLoad() {
    const session = await bootstrapAuthSession();

    if (session) {
      await wx.reLaunch({ url: '/pages/workbench/index' });
      return;
    }

    this.setData({
      loading: false
    });
  },
  async handleLogin() {
    if (this.data.loading || this.data.submitting) {
      return;
    }

    this.setData({
      submitting: true,
      errorMessage: ''
    });

    try {
      const displayName = await resolveLoginDisplayName();
      await loginAsLandlord(displayName);
      await wx.reLaunch({ url: '/pages/workbench/index' });
    } catch (error) {
      this.setData({
        errorMessage: resolveLoginErrorMessage(error),
        submitting: false
      });
      return;
    }

    this.setData({
      submitting: false
    });
  }
});
