import { listAssets } from '../../services/asset';
import { saveLease } from '../../services/lease';
import { getRentableUnitDetail } from '../../services/rentable-unit';
import { listRoomsByAsset } from '../../services/room';
import { saveTenant } from '../../services/tenant';

type AssetItem = Record<string, unknown> & {
  id: string;
  name: string;
  address?: string;
};

type CustomFeeDraft = {
  key: string;
  label: string;
  amount: string;
  cadence: 'cycle' | 'once';
  feeNature: '' | 'recurring' | 'one_time' | 'deposit';
};

type RenewBaseLease = Record<string, any> & {
  id: string;
  roomId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  actualEndDate?: string;
  billingCycleDays?: number;
  rentAmount?: number;
  depositAmount?: number;
  feeRules?: Record<string, any>;
  note?: string;
};

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + days);
  return formatDateKey(date);
}

function addMonthsInclusive(startDate: string, months: number) {
  const date = new Date(`${startDate}T00:00:00`);
  date.setMonth(date.getMonth() + months);
  date.setDate(date.getDate() - 1);
  return formatDateKey(date);
}

function resolveFeeRuleAmount(feeRules: Record<string, any> | undefined, key: string, fallback = 0) {
  const amount = Number(feeRules?.[key]?.amount ?? fallback);
  return Number.isFinite(amount) && amount > 0 ? String(amount) : '';
}

function resolveFeeRuleCadence(feeRules: Record<string, any> | undefined, key: string) {
  return feeRules?.[key]?.cadence === 'once' ? 'once' : 'cycle';
}

function buildRenewCustomFees(feeRules: Record<string, any> | undefined): CustomFeeDraft[] {
  const customItems = Array.isArray(feeRules?.customFeeItems) ? feeRules.customFeeItems : [];

  return customItems.map((item, index) => ({
    key: `renew_custom_${Date.now()}_${index}`,
    label: String(item.label || ''),
    amount: Number(item.amount || 0) > 0 ? String(item.amount) : '',
    cadence: item.cadence === 'once' ? 'once' : 'cycle',
    feeNature: item.feeNature === 'deposit' || item.feeNature === 'one_time' || item.feeNature === 'recurring'
      ? item.feeNature
      : ''
  }));
}

function resolveLeaseSaveErrorMessage(error: unknown) {
  const payload = error as { message?: string; errMsg?: string } | undefined;
  const rawMessage = `${payload?.message ?? ''} ${payload?.errMsg ?? ''}`.trim();

  if (!rawMessage) {
    return '';
  }

  if (rawMessage.includes('租约开始日期不能晚于结束日期')) {
    return '租约开始日期不能晚于结束日期，请调整后再保存。';
  }

  if (rawMessage.includes('租约时间冲突')) {
    const matched = rawMessage.match(/租约时间冲突[^。]*。?/);
    return matched?.[0] ?? '租约时间冲突：当前房间在该时间段已有租约，请调整后再保存。';
  }

  if (rawMessage.includes('租约日期不完整')) {
    return '租约日期不完整，请填写开始和结束日期后再保存。';
  }

  return '';
}

Page({
  data: {
    pageTitle: '租约维护',
    pageIntro: '先选房源和房间，再录入租户与费用，保存后即可进入账单与提醒链路。',
    pageHint: '所有信息会用于首页建议、异常识别和详情处理。',
    submitButtonText: '保存租约',
    isRenewMode: false,
    renewRoomId: '',
    renewSourceLeaseId: '',
    renewTenantId: '',
    renewPrefilled: false,
    assets: [] as AssetItem[],
    rooms: [] as Array<Record<string, unknown>>,
    roomIndex: 0,
    billingCycleOptions: ['30 天', '31 天', '按月近似 28 天'],
    managementCadenceOptions: ['周期性费用', '一次性费用'],
    customFeeNatureOptions: ['周期性费用', '一次性费用', '押金类费用'],
    customFeeNatureValues: ['recurring', 'one_time', 'deposit'] as Array<'recurring' | 'one_time' | 'deposit'>,
    assetSearchKeyword: '',
    visibleAssets: [] as AssetItem[],
    selectedAssetId: '',
    selectedAssetName: '',
    selectedRoomId: '',
    tenantName: '',
    tenantPhone: '',
    startDate: '2026-04-02',
    endDate: '2027-04-01',
    billingCycleDays: '30',
    rentAmount: '',
    depositAmount: '',
    managementAmount: '',
    managementCadence: 'cycle' as 'cycle' | 'once',
    fireDepositAmount: '',
    lockCardDepositAmount: '',
    miscAmount: '',
    customFeeItems: [] as CustomFeeDraft[],
    message: '',
    roomHint: '请先通过搜索并点选房源',
    submitting: false
  },
  onLoad(query: Record<string, string>) {
    const isRenewMode = query.mode === 'renew' && Boolean(query.roomId) && Boolean(query.leaseId);

    if (!isRenewMode) {
      return;
    }

    this.setData({
      pageTitle: '续租',
      pageIntro: '沿用原租户与费用规则生成新的租约，原租约和历史账单会保留。',
      pageHint: '续租只会新增一条租约，请确认新租期没有与已有租约重叠。',
      submitButtonText: '保存续租',
      isRenewMode: true,
      renewRoomId: String(query.roomId || ''),
      renewSourceLeaseId: String(query.leaseId || '')
    });
  },
  async onShow() {
    await this.loadAssets();
  },
  async loadAssets() {
    const assets = (await listAssets()) as Array<Record<string, unknown>>;
    const nextAssets = (assets || []).map((item) => ({
      ...item,
      id: String(item.id || ''),
      name: String(item.name || ''),
      address: String(item.address || '')
    }));

    this.setData({
      assets: nextAssets,
      selectedAssetId: '',
      selectedAssetName: '',
      rooms: [],
      roomIndex: 0,
      selectedRoomId: '',
      roomHint: nextAssets.length ? '请先通过搜索并点选房源' : '请先去房源维护录入房源'
    });
    this.applyAssetFilter(nextAssets, this.data.assetSearchKeyword);

    if (this.data.isRenewMode && this.data.renewRoomId && !this.data.renewPrefilled) {
      await this.applyRenewPrefill(nextAssets);
    }
  },
  async applyRenewPrefill(assets: AssetItem[]) {
    try {
      const detail = await getRentableUnitDetail({ roomId: this.data.renewRoomId }) as Record<string, any>;
      const activeLease = detail.activeLease?.id ? detail.activeLease as RenewBaseLease : null;
      const history = Array.isArray(detail.leaseHistory) ? detail.leaseHistory as RenewBaseLease[] : [];
      const allLeases = [activeLease, ...history].filter((item): item is RenewBaseLease => Boolean(item?.id));
      const baseLease = allLeases.find((lease) => lease.id === this.data.renewSourceLeaseId) ?? allLeases[0];

      if (!baseLease?.id) {
        throw new Error('Renew source lease not found.');
      }

      const assetId = String(detail.asset?.id || '');
      const roomId = String(detail.room?.id || baseLease.roomId || this.data.renewRoomId);
      const asset = assets.find((item) => item.id === assetId) ?? {
        id: assetId,
        name: String(detail.asset?.name || ''),
        address: String(detail.asset?.address || '')
      };
      const rooms = assetId ? (await listRoomsByAsset(assetId)) as Array<Record<string, unknown>> : [];
      const roomIndex = Math.max(0, rooms.findIndex((room) => String(room.id || '') === roomId));
      const tenantHistory = Array.isArray(detail.tenantHistory) ? detail.tenantHistory : [];
      const tenant = tenantHistory.find((item) =>
        String(item.id || '') === String(baseLease.tenantId || '') ||
        String(item._id || '') === String(baseLease.tenantId || '')
      ) ?? null;
      const baseEndDate = String(baseLease.actualEndDate || baseLease.endDate || '').slice(0, 10);
      const nextStartDate = addDays(baseEndDate, 1);
      const nextEndDate = addMonthsInclusive(nextStartDate, 12);
      const feeRules = baseLease.feeRules ?? {};

      this.setData({
        visibleAssets: asset.id ? [asset] : [],
        selectedAssetId: asset.id,
        selectedAssetName: asset.name,
        rooms,
        roomIndex,
        selectedRoomId: roomId,
        roomHint: '续租沿用原房源与房间',
        tenantName: String(tenant?.name || baseLease.tenantName || ''),
        tenantPhone: String(tenant?.phone || ''),
        renewTenantId: String(baseLease.tenantId || ''),
        startDate: nextStartDate,
        endDate: nextEndDate,
        billingCycleDays: String(baseLease.billingCycleDays || 30),
        rentAmount: resolveFeeRuleAmount(feeRules, 'rent', baseLease.rentAmount),
        depositAmount: resolveFeeRuleAmount(feeRules, 'deposit', baseLease.depositAmount),
        managementAmount: resolveFeeRuleAmount(feeRules, 'management'),
        managementCadence: resolveFeeRuleCadence(feeRules, 'management'),
        fireDepositAmount: resolveFeeRuleAmount(feeRules, 'fireDeposit'),
        lockCardDepositAmount: resolveFeeRuleAmount(feeRules, 'lockCardDeposit'),
        miscAmount: resolveFeeRuleAmount(feeRules, 'misc'),
        customFeeItems: buildRenewCustomFees(feeRules),
        renewPrefilled: true
      });
    } catch (error) {
      console.error('prefill renew lease failed', error);
      wx.showToast({
        title: '续租信息加载失败',
        icon: 'none'
      });
    }
  },
  async loadRooms(assetId: string) {
    const rooms = (await listRoomsByAsset(assetId)) as Array<Record<string, unknown>>;
    const nextRooms = rooms || [];
    const firstRoom = nextRooms[0] || null;

    this.setData({
      rooms: nextRooms,
      roomIndex: 0,
      selectedRoomId: firstRoom ? String(firstRoom.id || '') : '',
      roomHint: firstRoom ? '已加载该房源下的房间' : '该房源下还没有房间，请先在房源列表里添加房间'
    });
  },
  handleInputChange(event: WechatMiniprogram.Input) {
    const field = event.currentTarget.dataset.field as string;
    this.setData({
      [field]: event.detail.value
    });
  },
  handleAssetSearch(event: WechatMiniprogram.Input) {
    const keyword = String(event.detail.value || '');
    this.setData({
      assetSearchKeyword: keyword
    });
    this.applyAssetFilter(this.data.assets, keyword);
  },
  applyAssetFilter(assets: AssetItem[], keyword: string) {
    const normalized = String(keyword || '').trim().toLowerCase();
    const filtered = !normalized
      ? assets
      : assets.filter((item) => {
          const text = [item.name, item.address, item.id].filter(Boolean).join(' ').toLowerCase();
          return text.includes(normalized);
        });

    this.setData({
      visibleAssets: normalized ? filtered : filtered.slice(0, 3)
    });
  },
  async selectAsset(event: WechatMiniprogram.BaseEvent) {
    const assetId = String(event.currentTarget.dataset.assetId || '');
    const assetName = String(event.currentTarget.dataset.assetName || '');

    if (!assetId) {
      return;
    }

    if (this.data.selectedAssetId === assetId) {
      return;
    }

    this.setData({
      selectedAssetId: assetId,
      selectedAssetName: assetName,
      rooms: [],
      roomIndex: 0,
      selectedRoomId: '',
      roomHint: '正在加载该房源下的房间...'
    });

    await this.loadRooms(assetId);
  },
  handleRoomChange(event: WechatMiniprogram.PickerChange) {
    const roomIndex = Number(event.detail.value || 0);
    const room = this.data.rooms[roomIndex] || null;

    this.setData({
      roomIndex,
      selectedRoomId: room ? String(room.id || '') : ''
    });
  },
  handleDateChange(event: WechatMiniprogram.PickerChange) {
    const field = event.currentTarget.dataset.field as string;
    this.setData({
      [field]: event.detail.value
    });
  },
  handleBillingCycleChange(event: WechatMiniprogram.PickerChange) {
    const optionIndex = Number(event.detail.value || 0);
    const cycleValues = ['30', '31', '28'];
    this.setData({
      billingCycleDays: cycleValues[optionIndex] || '30'
    });
  },
  handleManagementCadenceChange(event: WechatMiniprogram.PickerChange) {
    const optionIndex = Number(event.detail.value || 0);
    this.setData({
      managementCadence: optionIndex === 1 ? 'once' : 'cycle'
    });
  },
  addCustomFeeItem() {
    const index = this.data.customFeeItems.length + 1;
    this.setData({
      customFeeItems: [
        ...this.data.customFeeItems,
        {
          key: `custom_${Date.now()}_${index}`,
          label: '',
          amount: '',
          cadence: 'cycle',
          feeNature: ''
        }
      ]
    });
  },
  handleCustomFeeInput(event: WechatMiniprogram.Input) {
    const index = Number(event.currentTarget.dataset.index || 0);
    const field = event.currentTarget.dataset.field as keyof CustomFeeDraft;
    const customFeeItems = this.data.customFeeItems.slice();
    customFeeItems[index] = {
      ...customFeeItems[index],
      [field]: event.detail.value
    };
    this.setData({ customFeeItems });
  },
  handleCustomFeeNatureChange(event: WechatMiniprogram.PickerChange) {
    const index = Number(event.currentTarget.dataset.index || 0);
    const optionIndex = Number(event.detail.value || 0);
    const customFeeItems = this.data.customFeeItems.slice();
    customFeeItems[index] = {
      ...customFeeItems[index],
      feeNature: this.data.customFeeNatureValues[optionIndex] || ''
    };
    this.setData({ customFeeItems });
  },
  buildCustomFeeItems() {
    return this.data.customFeeItems
      .filter((item) => item.label.trim() || Number(item.amount || 0) > 0)
      .map((item, index) => ({
        key: item.key || `custom_${index + 1}`,
        label: item.label.trim(),
        amount: Number(item.amount || 0),
        cadence: item.feeNature === 'one_time' || item.feeNature === 'deposit' ? 'once' : item.cadence,
        feeNature: item.feeNature
      }));
  },
  async handleSubmit() {
    if (this.data.submitting) {
      return;
    }

    if (!this.data.selectedAssetId) {
      wx.showToast({
        title: '请先点选房源',
        icon: 'none'
      });
      return;
    }

    if (!this.data.selectedRoomId) {
      wx.showToast({
        title: '请先选择房间',
        icon: 'none'
      });
      return;
    }

    if (!this.data.tenantName) {
      wx.showToast({
        title: '请填写租户姓名',
        icon: 'none'
      });
      return;
    }

    const customFeeItems = this.buildCustomFeeItems();
    if (customFeeItems.some((item) => !item.feeNature)) {
      wx.showToast({
        title: '请选择自定义费用性质',
        icon: 'none'
      });
      return;
    }

    this.setData({
      submitting: true,
      message: ''
    });

    try {
      const tenantPayload = {
        name: this.data.tenantName,
        phone: this.data.tenantPhone,
        note: ''
      };
      const tenant = this.data.isRenewMode && this.data.renewTenantId
        ? (await saveTenant({
            tenantId: this.data.renewTenantId,
            tenant: tenantPayload
          })) as { id: string }
        : (await saveTenant({
            tenant: tenantPayload
          })) as { id: string };
      const tenantId = String(tenant.id || this.data.renewTenantId || '');

      await saveLease({
        lease: {
          roomId: this.data.selectedRoomId,
          tenantId,
          startDate: this.data.startDate,
          endDate: this.data.endDate,
          billingCycleDays: Number(this.data.billingCycleDays || 30),
          rentAmount: Number(this.data.rentAmount || 0),
          depositAmount: Number(this.data.depositAmount || 0),
          feeRules: {
            rent: {
              amount: Number(this.data.rentAmount || 0),
              cadence: 'cycle'
            },
            deposit: {
              amount: Number(this.data.depositAmount || 0),
              cadence: 'once'
            },
            management: Number(this.data.managementAmount || 0)
              ? { amount: Number(this.data.managementAmount || 0), cadence: this.data.managementCadence }
              : undefined,
            fireDeposit: Number(this.data.fireDepositAmount || 0)
              ? { amount: Number(this.data.fireDepositAmount || 0), cadence: 'once' }
              : undefined,
            lockCardDeposit: Number(this.data.lockCardDepositAmount || 0)
              ? { amount: Number(this.data.lockCardDepositAmount || 0), cadence: 'once' }
              : undefined,
            misc: Number(this.data.miscAmount || 0)
              ? { amount: Number(this.data.miscAmount || 0), cadence: 'cycle' }
              : undefined,
            customFeeItems
          },
          note: ''
        }
      });

      if (this.data.isRenewMode) {
        await wx.showModal({
          title: '续租成功',
          content: '新租约已保存，原租约与历史账单已保留。',
          showCancel: false
        });
        this.exitPageAfterSave();
        return;
      }

      this.setData({
        tenantName: '',
        tenantPhone: '',
        startDate: '2026-04-02',
        endDate: '2027-04-01',
        billingCycleDays: '30',
        rentAmount: '',
        depositAmount: '',
        managementAmount: '',
        managementCadence: 'cycle',
        fireDepositAmount: '',
        lockCardDepositAmount: '',
        miscAmount: '',
        customFeeItems: [],
        message: '租户与租约已保存'
      });

      const action = await wx.showModal({
        title: '保存成功',
        content: '租约已保存。你可以继续录入下一条租约，或退出当前页面。',
        confirmText: '继续录入',
        cancelText: '退出页面'
      });

      if (!action.confirm) {
        this.exitPageAfterSave();
      }
    } catch (error) {
      console.error('save lease failed', error);
      const leaseErrorMessage = resolveLeaseSaveErrorMessage(error);

      if (leaseErrorMessage) {
        await wx.showModal({
          title: '租约保存失败',
          content: leaseErrorMessage,
          showCancel: false
        });
        return;
      }

      wx.showToast({
        title: '保存失败，请稍后重试',
        icon: 'none'
      });
    } finally {
      this.setData({
        submitting: false
      });
    }
  },
  exitPageAfterSave() {
    if (getCurrentPages().length > 1) {
      wx.navigateBack({
        delta: 1
      });
      return;
    }

    wx.switchTab({
      url: '/pages/ops/index'
    });
  }
});
