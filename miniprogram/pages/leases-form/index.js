"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const asset_1 = require("../../services/asset");
const lease_1 = require("../../services/lease");
const room_1 = require("../../services/room");
const tenant_1 = require("../../services/tenant");
function resolveLeaseSaveErrorMessage(error) {
    const payload = error;
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
        assets: [],
        rooms: [],
        roomIndex: 0,
        billingCycleOptions: ['30 天', '31 天', '按月近似 28 天'],
        managementCadenceOptions: ['周期性费用', '一次性费用'],
        customFeeNatureOptions: ['周期性费用', '一次性费用', '押金类费用'],
        customFeeNatureValues: ['recurring', 'one_time', 'deposit'],
        assetSearchKeyword: '',
        visibleAssets: [],
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
        managementCadence: 'cycle',
        fireDepositAmount: '',
        lockCardDepositAmount: '',
        customFeeItems: [],
        message: '',
        roomHint: '请先通过搜索并点选房源',
        submitting: false
    },
    async onShow() {
        await this.loadAssets();
    },
    async loadAssets() {
        const assets = (await (0, asset_1.listAssets)());
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
    },
    async loadRooms(assetId) {
        const rooms = (await (0, room_1.listRoomsByAsset)(assetId));
        const nextRooms = rooms || [];
        const firstRoom = nextRooms[0] || null;
        this.setData({
            rooms: nextRooms,
            roomIndex: 0,
            selectedRoomId: firstRoom ? String(firstRoom.id || '') : '',
            roomHint: firstRoom ? '已加载该房源下的房间' : '该房源下还没有房间，请先在房源列表里添加房间'
        });
    },
    handleInputChange(event) {
        const field = event.currentTarget.dataset.field;
        this.setData({
            [field]: event.detail.value
        });
    },
    handleAssetSearch(event) {
        const keyword = String(event.detail.value || '');
        this.setData({
            assetSearchKeyword: keyword
        });
        this.applyAssetFilter(this.data.assets, keyword);
    },
    applyAssetFilter(assets, keyword) {
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
    async selectAsset(event) {
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
    handleRoomChange(event) {
        const roomIndex = Number(event.detail.value || 0);
        const room = this.data.rooms[roomIndex] || null;
        this.setData({
            roomIndex,
            selectedRoomId: room ? String(room.id || '') : ''
        });
    },
    handleDateChange(event) {
        const field = event.currentTarget.dataset.field;
        this.setData({
            [field]: event.detail.value
        });
    },
    handleBillingCycleChange(event) {
        const optionIndex = Number(event.detail.value || 0);
        const cycleValues = ['30', '31', '28'];
        this.setData({
            billingCycleDays: cycleValues[optionIndex] || '30'
        });
    },
    handleManagementCadenceChange(event) {
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
    handleCustomFeeInput(event) {
        const index = Number(event.currentTarget.dataset.index || 0);
        const field = event.currentTarget.dataset.field;
        const customFeeItems = this.data.customFeeItems.slice();
        customFeeItems[index] = {
            ...customFeeItems[index],
            [field]: event.detail.value
        };
        this.setData({ customFeeItems });
    },
    handleCustomFeeNatureChange(event) {
        const index = Number(event.currentTarget.dataset.index || 0);
        const optionIndex = Number(event.detail.value || 0);
        const customFeeItems = this.data.customFeeItems.slice();
        customFeeItems[index] = {
            ...customFeeItems[index],
            feeNature: this.data.customFeeNatureValues[optionIndex] || ''
        };
        this.setData({ customFeeItems });
    },
    removeCustomFeeItem(event) {
        const index = Number(event.currentTarget.dataset.index || 0);
        this.setData({
            customFeeItems: this.data.customFeeItems.filter((_, itemIndex) => itemIndex !== index)
        });
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
            const tenant = (await (0, tenant_1.saveTenant)({
                tenant: tenantPayload
            }));
            await (0, lease_1.saveLease)({
                lease: {
                    roomId: this.data.selectedRoomId,
                    tenantId: tenant.id,
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
                        customFeeItems
                    },
                    note: ''
                }
            });
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
        }
        catch (error) {
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
        }
        finally {
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
