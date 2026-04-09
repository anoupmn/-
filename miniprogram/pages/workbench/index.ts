import { requireAuthSession } from '../../services/auth';
import { listAssets } from '../../services/asset';
import {
  getHomeDashboard,
  type DashboardAbnormalRow,
  type DashboardOverviewCard,
  type DashboardPayload,
  type DashboardRecommendation
} from '../../services/dashboard';
import { requestSubscribeMessage, SUBSCRIBE_TEMPLATE_CONFIG_ERROR } from '../../services/notification';
import {
  listRentableUnits,
  parseUnitListUrl,
  setPendingUnitListDrilldownQuery,
  stringifyUnitListQuery
} from '../../services/rentable-unit';

function buildUnitsUrl(query: Record<string, string>) {
  const queryString = stringifyUnitListQuery(query);
  return queryString ? `/pages/units/index?${queryString}` : '/pages/units/index';
}

function isTemplateConfigError(error: unknown) {
  const payload = error as { code?: string; errCode?: number; message?: string; errMsg?: string } | undefined;
  const message = `${payload?.message ?? ''} ${payload?.errMsg ?? ''}`;
  return (
    payload?.code === SUBSCRIBE_TEMPLATE_CONFIG_ERROR ||
    message.includes(SUBSCRIBE_TEMPLATE_CONFIG_ERROR) ||
    payload?.errCode === 20001 ||
    message.includes('No template data return')
  );
}

type OnboardingStep = {
  key: 'asset' | 'room' | 'lease';
  label: string;
  done: boolean;
};

type OnboardingGuide = {
  visible: boolean;
  completedSteps: number;
  totalSteps: number;
  progressText: string;
  steps: OnboardingStep[];
  nextAction: 'asset' | 'room' | 'lease' | 'none';
  nextActionLabel: string;
  nextActionHint: string;
};

function resolveAssetCount(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload.length;
  }

  const response = payload as { assets?: unknown[] } | undefined;
  if (Array.isArray(response?.assets)) {
    return response.assets.length;
  }

  return 0;
}

function resolveUnitRows(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload;
  }

  const response = payload as { units?: unknown[]; rows?: unknown[] } | undefined;
  if (Array.isArray(response?.units)) {
    return response.units;
  }

  if (Array.isArray(response?.rows)) {
    return response.rows;
  }

  return [];
}

function buildOnboardingGuide(assetCount: number, unitCount: number, occupiedCount: number): OnboardingGuide {
  const steps: OnboardingStep[] = [
    {
      key: 'asset',
      label: '新增房源',
      done: assetCount > 0
    },
    {
      key: 'room',
      label: '添加房间',
      done: unitCount > 0
    },
    {
      key: 'lease',
      label: '录入租约',
      done: occupiedCount > 0
    }
  ];
  const completedSteps = steps.filter((item) => item.done).length;
  const totalSteps = steps.length;
  const firstPendingStep = steps.find((item) => !item.done);

  if (!firstPendingStep) {
    return {
      visible: false,
      completedSteps,
      totalSteps,
      progressText: '首次建档已完成',
      steps,
      nextAction: 'none',
      nextActionLabel: '',
      nextActionHint: ''
    };
  }

  if (firstPendingStep.key === 'asset') {
    return {
      visible: true,
      completedSteps,
      totalSteps,
      progressText: `首次建档进度 ${completedSteps}/${totalSteps}`,
      steps,
      nextAction: 'asset',
      nextActionLabel: '第 1 步：新增房源',
      nextActionHint: '先录入房源基础信息，后续房间和租约都依赖它。'
    };
  }

  if (firstPendingStep.key === 'room') {
    return {
      visible: true,
      completedSteps,
      totalSteps,
      progressText: `首次建档进度 ${completedSteps}/${totalSteps}`,
      steps,
      nextAction: 'room',
      nextActionLabel: '第 2 步：添加房间',
      nextActionHint: '进入房源维护后，找到对应房源并点击“添加房间”。'
    };
  }

  return {
    visible: true,
    completedSteps,
    totalSteps,
    progressText: `首次建档进度 ${completedSteps}/${totalSteps}`,
    steps,
    nextAction: 'lease',
    nextActionLabel: '第 3 步：录入租约',
    nextActionHint: '完成租约录入后，即可在房源列表处理账单和维修。'
  };
}

Page({
  data: {
    isLoggedIn: false,
    displayName: '',
    status: '',
    isLoading: true,
    loadFailed: false,
    overviewCards: [] as DashboardOverviewCard[],
    abnormalRows: [] as DashboardAbnormalRow[],
    recommendation: null as DashboardRecommendation,
    recommendationUrl: '',
    onboardingGuide: {
      visible: false,
      completedSteps: 0,
      totalSteps: 3,
      progressText: '',
      steps: [] as OnboardingStep[],
      nextAction: 'none' as 'asset' | 'room' | 'lease' | 'none',
      nextActionLabel: '',
      nextActionHint: ''
    } as OnboardingGuide,
    subscriptionState: {
      consentState: 'unknown' as 'unknown' | 'accepted' | 'rejected',
      hasRequested: false,
      enabledRuleTypes: [] as string[]
    }
  },
  async loadOnboardingGuide() {
    const [assetResult, unitResult] = await Promise.allSettled([listAssets(), listRentableUnits()]);
    const assetCount = assetResult.status === 'fulfilled' ? resolveAssetCount(assetResult.value) : 0;
    const units =
      unitResult.status === 'fulfilled'
        ? resolveUnitRows(unitResult.value).map((item) => item as { mainStatus?: string })
        : [];
    const unitCount = units.length;
    const occupiedCount = units.filter((item) => String(item.mainStatus || '') === 'occupied').length;
    const onboardingGuide = buildOnboardingGuide(assetCount, unitCount, occupiedCount);

    // 模拟器或云函数异常时也尽量展示引导，避免新手看不到入口。
    const shouldFallbackShow =
      assetResult.status === 'rejected' &&
      unitResult.status === 'rejected' &&
      !onboardingGuide.visible;

    this.setData({
      onboardingGuide: shouldFallbackShow
        ? {
            ...onboardingGuide,
            visible: true,
            nextAction: 'asset',
            nextActionLabel: '第 1 步：新增房源',
            nextActionHint: '当前环境未读取到建档数据，建议先从新增房源开始。'
          }
        : onboardingGuide
    });
  },
  async loadDashboard() {
    this.setData({
      isLoading: true,
      loadFailed: false
    });

    try {
      const payload = (await getHomeDashboard()) as DashboardPayload;
      const enabledCount = payload.subscriptionState.enabledRuleTypes.length;
      const { hasRequested, consentState } = payload.subscriptionState;
      const status = hasRequested
        ? consentState === 'accepted'
          ? `已记录授权状态，当前启用 ${enabledCount} 类提醒规则。`
          : '已记录授权状态，可在提醒设置中调整规则并稍后重新授权。'
        : '提醒尚未订阅，但首页盘面已可直接进入处理列表。';

      this.setData({
        status,
        isLoading: false,
        overviewCards: payload.overviewCards.map((item) => ({
          ...item,
          url: buildUnitsUrl(item.query)
        })),
        abnormalRows: payload.abnormalRows.map((item) => ({
          ...item,
          url: buildUnitsUrl(item.query)
        })),
        recommendation: payload.recommendation,
        recommendationUrl: payload.recommendation ? buildUnitsUrl(payload.recommendation.actionQuery) : '',
        subscriptionState: payload.subscriptionState
      });
      await this.loadOnboardingGuide();
    } catch (error) {
      console.error('load workbench dashboard failed', error);
      this.setData({
        isLoading: false,
        loadFailed: true
      });
      wx.showToast({
        title: '加载首页失败，请下拉重试或稍后再试。',
        icon: 'none'
      });
    }
  },
  async onShow() {
    const session = await requireAuthSession();

    if (!session) {
      return;
    }

    this.setData({
      isLoggedIn: true,
      displayName: session.displayName
    });

    await this.loadDashboard();
  },
  async onPullDownRefresh() {
    if (!this.data.isLoggedIn) {
      return;
    }

    await this.loadDashboard();
    wx.stopPullDownRefresh();
  },
  async handleReminderEntry() {
    if (this.data.subscriptionState.hasRequested) {
      wx.navigateTo({
        url: '/pages/reminder-settings/index'
      });
      return;
    }

    try {
      const result = await requestSubscribeMessage();
      wx.showToast({
        title: result.consentState === 'accepted' ? '已记录授权状态' : '已记录授权结果',
        icon: 'none'
      });
      await this.loadDashboard();
    } catch (error) {
      console.error('request subscribe message failed', error);
      if (isTemplateConfigError(error)) {
        wx.showModal({
          title: '先配置订阅模板',
          content:
            '当前订阅模板 ID 还是占位值。请先在 miniprogram/config/notification.js 中填入真实模板 ID，再点“开启提醒”。',
          showCancel: false
        });
        await this.loadDashboard();
        return;
      }

      wx.showToast({
        title: '授权过程出现问题，请稍后重试',
        icon: 'none'
      });
      await this.loadDashboard();
    }
  },
  openOnboardingNextStep() {
    const nextAction = this.data.onboardingGuide.nextAction;

    if (nextAction === 'asset' || nextAction === 'room') {
      wx.navigateTo({
        url: '/pages/assets-form/index'
      });
      return;
    }

    if (nextAction === 'lease') {
      wx.navigateTo({
        url: '/pages/leases-form/index'
      });
    }
  },
  navigateTo(event: WechatMiniprogram.BaseEvent) {
    const url = event.currentTarget.dataset.url as string;

    if (!url) {
      return;
    }

    wx.navigateTo({ url });
  },
  openUnitsByUrl(url: string) {
    setPendingUnitListDrilldownQuery(parseUnitListUrl(url));
    wx.switchTab({
      url: '/pages/units/index'
    });
  },
  openOverviewCard(event: WechatMiniprogram.BaseEvent) {
    const url = event.currentTarget.dataset.url as string;

    if (!url) {
      return;
    }

    this.openUnitsByUrl(url);
  },
  openAbnormalRow(event: WechatMiniprogram.BaseEvent) {
    const url = event.currentTarget.dataset.url as string;

    if (!url) {
      return;
    }

    this.openUnitsByUrl(url);
  },
  openRecommendation() {
    if (!this.data.recommendationUrl) {
      return;
    }

    this.openUnitsByUrl(this.data.recommendationUrl);
  }
});
