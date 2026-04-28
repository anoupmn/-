"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const asset_1 = require("../../services/asset");
const room_1 = require("../../services/room");
const receipt_1 = require("../../services/receipt");
function currentMonthKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}
function asOptions(records, labelKey = 'name') {
    return records
        .filter((record) => record?.id)
        .map((record) => ({
        label: String(record[labelKey] || '未命名'),
        value: String(record.id)
    }));
}
function uniqueTenantOptions(receipts) {
    const map = new Map();
    receipts.forEach((receipt) => {
        if (receipt.tenantId && receipt.tenantName) {
            map.set(String(receipt.tenantId), String(receipt.tenantName));
        }
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
}
Page({
    data: {
        month: currentMonthKey(),
        assetId: '',
        roomId: '',
        tenantId: '',
        status: 'all',
        receipts: [],
        allReceipts: [],
        loading: false,
        error: '',
        assetOptions: [{ label: '全部房源', value: '' }],
        roomOptions: [{ label: '全部房间', value: '' }],
        tenantOptions: [{ label: '全部租客', value: '' }],
        statusOptions: [
            { label: '全部', value: 'all' },
            { label: '有效', value: 'active' },
            { label: '已作废', value: 'voided' }
        ],
        selectedAssetIndex: 0,
        selectedRoomIndex: 0,
        selectedTenantIndex: 0,
        selectedStatusIndex: 0
    },
    async onLoad() {
        await Promise.all([this.loadFilterOptions(), this.loadReceipts()]);
    },
    async loadFilterOptions() {
        try {
            const assets = await (0, asset_1.listAssets)();
            this.setData({
                assetOptions: [{ label: '全部房源', value: '' }, ...asOptions(assets)]
            });
            await this.loadRoomsForAsset();
        }
        catch (error) {
            console.error('load receipt filter options failed', error);
        }
    },
    async loadRoomsForAsset() {
        if (!this.data.assetId) {
            this.setData({
                roomOptions: [{ label: '全部房间', value: '' }],
                selectedRoomIndex: 0,
                roomId: ''
            });
            return;
        }
        try {
            const rooms = await (0, room_1.listRoomsByAsset)(this.data.assetId);
            this.setData({
                roomOptions: [{ label: '全部房间', value: '' }, ...asOptions(rooms)],
                selectedRoomIndex: 0,
                roomId: ''
            });
        }
        catch (error) {
            console.error('load receipt room options failed', error);
            this.setData({
                roomOptions: [{ label: '全部房间', value: '' }],
                selectedRoomIndex: 0,
                roomId: ''
            });
        }
    },
    buildFilters() {
        const filters = {};
        if (this.data.month) {
            filters.month = this.data.month;
        }
        if (this.data.assetId) {
            filters.assetId = this.data.assetId;
        }
        if (this.data.roomId) {
            filters.roomId = this.data.roomId;
        }
        if (this.data.tenantId) {
            filters.tenantId = this.data.tenantId;
        }
        if (this.data.status) {
            filters.status = this.data.status;
        }
        return filters;
    },
    async loadReceipts() {
        this.setData({
            loading: true,
            error: ''
        });
        try {
            const result = await (0, receipt_1.listReceiptRecords)({ filters: this.buildFilters() });
            const receipts = result.receipts || [];
            this.setData({
                receipts,
                allReceipts: receipts,
                tenantOptions: [{ label: '全部租客', value: '' }, ...uniqueTenantOptions(receipts)],
                loading: false
            });
        }
        catch (error) {
            console.error('load receipt records failed', error);
            this.setData({
                receipts: [],
                loading: false,
                error: '收据记录加载失败，请稍后重试'
            });
        }
    },
    async handleMonthChange(event) {
        this.setData({
            month: String(event.detail.value || '')
        });
        await this.loadReceipts();
    },
    async clearMonth() {
        this.setData({
            month: ''
        });
        await this.loadReceipts();
    },
    async handleAssetChange(event) {
        const selectedAssetIndex = Number(event.detail.value || 0);
        const asset = this.data.assetOptions[selectedAssetIndex];
        this.setData({
            selectedAssetIndex,
            assetId: asset?.value || '',
            selectedTenantIndex: 0,
            tenantId: ''
        });
        await this.loadRoomsForAsset();
        await this.loadReceipts();
    },
    async handleRoomChange(event) {
        const selectedRoomIndex = Number(event.detail.value || 0);
        const room = this.data.roomOptions[selectedRoomIndex];
        this.setData({
            selectedRoomIndex,
            roomId: room?.value || '',
            selectedTenantIndex: 0,
            tenantId: ''
        });
        await this.loadReceipts();
    },
    async handleTenantChange(event) {
        const selectedTenantIndex = Number(event.detail.value || 0);
        const tenant = this.data.tenantOptions[selectedTenantIndex];
        this.setData({
            selectedTenantIndex,
            tenantId: tenant?.value || ''
        });
        await this.loadReceipts();
    },
    async handleStatusChange(event) {
        const selectedStatusIndex = Number(event.detail.value || 0);
        const status = this.data.statusOptions[selectedStatusIndex];
        this.setData({
            selectedStatusIndex,
            status: status?.value || 'all'
        });
        await this.loadReceipts();
    },
    openReceipt(event) {
        const id = String(event.currentTarget.dataset.id || '');
        if (!id) {
            return;
        }
        wx.navigateTo({
            url: `/pages/receipt/index?receiptId=${id}`
        });
    },
    openRoom(event) {
        const id = String(event.currentTarget.dataset.id || '');
        if (!id) {
            return;
        }
        wx.navigateTo({
            url: `/pages/unit-detail/index?roomId=${id}`
        });
    }
});
