import { requireAuthSession } from '../../services/auth';
import { setPendingUnitListDrilldownQuery } from '../../services/rentable-unit';

Page({
  data: {
    displayName: '',
    resettingData: false,
    resettingAllData: false
  },
  async onShow() {
    const session = await requireAuthSession();

    if (!session) {
      return;
    }

    this.setData({
      displayName: session.displayName
    });
  },
  navigateTo(event: WechatMiniprogram.BaseEvent) {
    const url = event.currentTarget.dataset.url as string;

    if (!url) {
      return;
    }

    wx.navigateTo({
      url
    });
  },
  openUnitsTab() {
    wx.switchTab({
      url: '/pages/units/index'
    });
  },
  openLeaseList() {
    setPendingUnitListDrilldownQuery({
      mainStatus: 'occupied'
    });

    wx.switchTab({
      url: '/pages/units/index'
    });
  },
  async resetTestData() {
    if (this.data.resettingData || this.data.resettingAllData) {
      return;
    }

    const action = await wx.showModal({
      title: '确认清空测试数据',
      content: '将清空当前账号下所有业务数据（房源、房间、租客、租约、账单、维修、异常、提醒）。此操作不可撤销。',
      confirmText: '确认清空',
      confirmColor: '#c0392b'
    });

    if (!action.confirm) {
      return;
    }

    this.setData({
      resettingData: true
    });

    try {
      const result = await wx.cloud.callFunction({
        name: 'data-reset',
        data: {
          confirmToken: 'RESET_MY_TEST_DATA'
        }
      }) as {
        result?: {
          totalRemoved?: number;
        };
      };

      wx.showToast({
        title: `已清空 ${result.result?.totalRemoved ?? 0} 条`,
        icon: 'none'
      });
    } catch (error) {
      console.error('reset test data failed', error);
      wx.showToast({
        title: '清空失败，请检查云函数上传状态',
        icon: 'none'
      });
    } finally {
      this.setData({
        resettingData: false
      });
    }
  },
  async resetAllTestData() {
    if (this.data.resettingData || this.data.resettingAllData) {
      return;
    }

    const firstConfirm = await wx.showModal({
      title: '高危操作',
      content: '将清空所有账号的业务数据，仅用于测试环境。请确认你当前在测试环境。',
      confirmText: '继续',
      confirmColor: '#c0392b'
    });

    if (!firstConfirm.confirm) {
      return;
    }

    const secondConfirm = await wx.showModal({
      title: '最终确认',
      content: '请再次确认：要清空所有账号数据，且不可恢复。',
      confirmText: '确认全清',
      confirmColor: '#c0392b'
    });

    if (!secondConfirm.confirm) {
      return;
    }

    this.setData({
      resettingAllData: true
    });

    try {
      const result = await wx.cloud.callFunction({
        name: 'data-reset',
        data: {
          scope: 'all',
          confirmToken: 'RESET_ALL_TEST_DATA'
        }
      }) as {
        result?: {
          totalRemoved?: number;
        };
      };

      wx.showToast({
        title: `已全清 ${result.result?.totalRemoved ?? 0} 条`,
        icon: 'none'
      });
    } catch (error) {
      console.error('reset all test data failed', error);
      wx.showToast({
        title: '全清失败，请检查云函数上传状态',
        icon: 'none'
      });
    } finally {
      this.setData({
        resettingAllData: false
      });
    }
  }
});
