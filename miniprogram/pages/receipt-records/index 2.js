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
        .filter((record) => record === null || record === void 0 ? void 0 : record.id)
        .map((record) => ({
        label: String(record[labelKey] || '未命名'),
        value: String(record.id)
    }));
}
function formatDateTime(value) {
    const source = String(value || '').trim();
    if (!source) {
        return '';
    }
    const parsed = new Date(source);
    if (!Number.isNaN(parsed.getTime()) && /[T\s]\d{2}:\d{2}/.test(source)) {
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const day = String(parsed.getDate()).padStart(2, '0');
        const hour = String(parsed.getHours()).padStart(2, '0');
        const minute = String(parsed.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hour}:${minute}`;
    }
    return source.replace('T', ' ').replace(/\.\d{3}Z?$/, '').replace(/Z$/, '');
}
function normalizeReceiptRecords(receipts) {
    return receipts.map((receipt) => ({
        ...receipt,
        displayReceivedAt: formatDateTime(receipt.receivedAt),
        displayCreatedAt: formatDateTime(receipt.createdAt)
    }));
}
function buildIssueLeaseLabel(lease) {
    const tenant = lease.tenantName || '未知租客';
    const period = lease.startDate && lease.endDate ? `${lease.startDate} 至 ${lease.endDate}` : '租约';
    return `${tenant} · ${period}`;
}
function uniqueIssueOptions(leases, valueKey, labelKey) {
    const map = new Map();
    leases.forEach((lease) => {
        const value = String(lease[valueKey] || '');
        if (value && !map.has(value)) {
            map.set(value, String(lease[labelKey] || '未命名'));
        }
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
}
function buildIssueSelectionState(input) {
    var _a, _b, _c;
    const issueAssetOptions = uniqueIssueOptions(input.leases, 'assetId', 'assetName');
    const selectedIssueAssetId = issueAssetOptions.some((option) => option.value === input.assetId)
        ? String(input.assetId)
        : String(((_a = issueAssetOptions[0]) === null || _a === void 0 ? void 0 : _a.value) || '');
    const assetLeases = input.leases.filter((lease) => String(lease.assetId || '') === selectedIssueAssetId);
    const issueRoomOptions = uniqueIssueOptions(assetLeases, 'roomId', 'roomName');
    const selectedIssueRoomId = issueRoomOptions.some((option) => option.value === input.roomId)
        ? String(input.roomId)
        : String(((_b = issueRoomOptions[0]) === null || _b === void 0 ? void 0 : _b.value) || '');
    const roomLeases = assetLeases.filter((lease) => String(lease.roomId || '') === selectedIssueRoomId);
    const selectedLease = roomLeases.find((lease) => lease.leaseId === input.leaseId) || roomLeases[0];
    const receiptMonthOptions = (selectedLease === null || selectedLease === void 0 ? void 0 : selectedLease.months) || [];
    const selectedMonth = receiptMonthOptions.some((month) => month.month === input.month)
        ? String(input.month)
        : String(((_c = receiptMonthOptions[0]) === null || _c === void 0 ? void 0 : _c.month) || '');
    return {
        issueAssetOptions,
        issueRoomOptions,
        issueLeaseOptions: roomLeases.map((lease) => ({
            label: buildIssueLeaseLabel(lease),
            value: lease.leaseId
        })),
        receiptMonthOptions,
        selectedIssueAssetIndex: Math.max(0, issueAssetOptions.findIndex((option) => option.value === selectedIssueAssetId)),
        selectedIssueRoomIndex: Math.max(0, issueRoomOptions.findIndex((option) => option.value === selectedIssueRoomId)),
        selectedReceiptLeaseIndex: Math.max(0, roomLeases.findIndex((lease) => lease.leaseId === (selectedLease === null || selectedLease === void 0 ? void 0 : selectedLease.leaseId))),
        selectedReceiptMonthIndex: Math.max(0, receiptMonthOptions.findIndex((month) => month.month === selectedMonth)),
        selectedIssueAssetId,
        selectedIssueRoomId,
        selectedReceiptLeaseId: (selectedLease === null || selectedLease === void 0 ? void 0 : selectedLease.leaseId) || '',
        selectedReceiptMonth: selectedMonth
    };
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
function monthLabel(month) {
    const [year, value] = month.split('-');
    return year && value ? `${year}年${value}月` : month || '未分组';
}
function groupReceipts(receipts) {
    const groups = receipts.reduce((acc, receipt) => {
        var _a;
        const month = receipt.monthKey || 'unknown';
        acc.set(month, [...((_a = acc.get(month)) !== null && _a !== void 0 ? _a : []), receipt]);
        return acc;
    }, new Map());
    return Array.from(groups.entries())
        .map(([month, groupReceipts]) => {
        const sortedReceipts = [...groupReceipts].sort((left, right) => `${left.assetName}/${left.roomName}/${left.tenantName}`.localeCompare(`${right.assetName}/${right.roomName}/${right.tenantName}`) ||
            String(right.createdAt || '').localeCompare(String(left.createdAt || '')));
        return {
            month,
            monthLabel: monthLabel(month),
            count: sortedReceipts.length,
            totalAmount: sortedReceipts.reduce((sum, receipt) => sum + Number(receipt.totalAmount || 0), 0),
            receipts: sortedReceipts
        };
    })
        .sort((left, right) => right.month.localeCompare(left.month));
}
function resolveReceiptCloudError(error, fallback) {
    var _a, _b;
    const record = error;
    const raw = `${(_a = record === null || record === void 0 ? void 0 : record.message) !== null && _a !== void 0 ? _a : ''} ${(_b = record === null || record === void 0 ? void 0 : record.errMsg) !== null && _b !== void 0 ? _b : ''}`.toLowerCase();
    if (raw.includes('functionname parameter could not be found') ||
        raw.includes('function_not_found') ||
        raw.includes('function not found')) {
        return '收据云函数未部署，请上传 receipt-list、receipt-lease-options、receipt-create';
    }
    if (raw.includes('already has an active receipt')) {
        return '该租约本月已开过收据，请刷新后查看本月收据';
    }
    return fallback;
}
Page({
    data: {
        month: currentMonthKey(),
        assetId: '',
        roomId: '',
        tenantId: '',
        receipts: [],
        receiptGroups: [],
        allReceipts: [],
        receiptLeaseOptions: [],
        issueAssetOptions: [],
        issueRoomOptions: [],
        issueLeaseOptions: [],
        receiptMonthOptions: [],
        selectedIssueAssetIndex: 0,
        selectedIssueRoomIndex: 0,
        selectedReceiptLeaseIndex: 0,
        selectedReceiptMonthIndex: 0,
        selectedIssueAssetId: '',
        selectedIssueRoomId: '',
        selectedReceiptLeaseId: '',
        selectedReceiptMonth: '',
        creatingReceipt: false,
        deletingReceiptId: '',
        loading: false,
        error: '',
        issueError: '',
        assetOptions: [{ label: '全部房源', value: '' }],
        roomOptions: [{ label: '全部房间', value: '' }],
        tenantOptions: [{ label: '全部租客', value: '' }],
        selectedAssetIndex: 0,
        selectedRoomIndex: 0,
        selectedTenantIndex: 0
    },
    async onLoad() {
        await Promise.all([this.loadFilterOptions(), this.loadReceipts(), this.loadReceiptLeaseOptions()]);
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
        return filters;
    },
    async loadReceipts() {
        this.setData({
            loading: true,
            error: ''
        });
        try {
            const result = await (0, receipt_1.listReceiptRecords)({ filters: this.buildFilters() });
            const receipts = normalizeReceiptRecords(result.receipts || []);
            this.setData({
                receipts,
                receiptGroups: groupReceipts(receipts),
                allReceipts: receipts,
                tenantOptions: [{ label: '全部租客', value: '' }, ...uniqueTenantOptions(receipts)],
                loading: false
            });
        }
        catch (error) {
            console.error('load receipt records failed', error);
            this.setData({
                receipts: [],
                receiptGroups: [],
                loading: false,
                error: resolveReceiptCloudError(error, '收据管理加载失败，请稍后重试')
            });
        }
    },
    async loadReceiptLeaseOptions() {
        try {
            const result = await (0, receipt_1.listReceiptLeaseOptions)({});
            const receiptLeaseOptions = result.leases || [];
            this.setData({
                receiptLeaseOptions,
                ...buildIssueSelectionState({ leases: receiptLeaseOptions }),
                issueError: ''
            });
        }
        catch (error) {
            console.error('load receipt lease options failed', error);
            this.setData({
                receiptLeaseOptions: [],
                issueAssetOptions: [],
                issueRoomOptions: [],
                issueLeaseOptions: [],
                receiptMonthOptions: [],
                selectedIssueAssetId: '',
                selectedIssueRoomId: '',
                selectedReceiptLeaseId: '',
                selectedReceiptMonth: '',
                issueError: resolveReceiptCloudError(error, '可开收据月份加载失败，请稍后重试')
            });
        }
    },
    handleIssueAssetChange(event) {
        const selectedIssueAssetIndex = Number(event.detail.value || 0);
        const asset = this.data.issueAssetOptions[selectedIssueAssetIndex];
        this.setData({
            ...buildIssueSelectionState({
                leases: this.data.receiptLeaseOptions,
                assetId: (asset === null || asset === void 0 ? void 0 : asset.value) || ''
            })
        });
    },
    handleIssueRoomChange(event) {
        const selectedIssueRoomIndex = Number(event.detail.value || 0);
        const room = this.data.issueRoomOptions[selectedIssueRoomIndex];
        this.setData({
            ...buildIssueSelectionState({
                leases: this.data.receiptLeaseOptions,
                assetId: this.data.selectedIssueAssetId,
                roomId: (room === null || room === void 0 ? void 0 : room.value) || ''
            })
        });
    },
    handleReceiptLeaseChange(event) {
        const selectedReceiptLeaseIndex = Number(event.detail.value || 0);
        const lease = this.data.issueLeaseOptions[selectedReceiptLeaseIndex];
        this.setData({
            ...buildIssueSelectionState({
                leases: this.data.receiptLeaseOptions,
                assetId: this.data.selectedIssueAssetId,
                roomId: this.data.selectedIssueRoomId,
                leaseId: (lease === null || lease === void 0 ? void 0 : lease.value) || ''
            })
        });
    },
    handleReceiptMonthChange(event) {
        const selectedReceiptMonthIndex = Number(event.detail.value || 0);
        const month = this.data.receiptMonthOptions[selectedReceiptMonthIndex];
        this.setData({
            selectedReceiptMonthIndex,
            selectedReceiptMonth: (month === null || month === void 0 ? void 0 : month.month) || ''
        });
    },
    async createReceiptForSelectedLease() {
        if (!this.data.selectedReceiptLeaseId || !this.data.selectedReceiptMonth || this.data.creatingReceipt) {
            wx.showToast({
                title: '请选择租约和月份',
                icon: 'none'
            });
            return;
        }
        this.setData({
            creatingReceipt: true,
            issueError: ''
        });
        try {
            const receipt = await (0, receipt_1.createReceipt)({
                leaseId: this.data.selectedReceiptLeaseId,
                month: this.data.selectedReceiptMonth
            });
            wx.showToast({
                title: '收据已生成',
                icon: 'success'
            });
            await Promise.all([this.loadReceipts(), this.loadReceiptLeaseOptions()]);
            wx.navigateTo({
                url: `/pages/receipt/index?receiptId=${receipt.id}`
            });
        }
        catch (error) {
            console.error('create receipt from lease failed', error);
            const message = resolveReceiptCloudError(error, '开具收据失败');
            this.setData({
                issueError: message
            });
            if (message.includes('已开过收据')) {
                await Promise.all([this.loadReceipts(), this.loadReceiptLeaseOptions()]);
            }
            wx.showToast({
                title: message,
                icon: 'none'
            });
        }
        finally {
            this.setData({
                creatingReceipt: false
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
            assetId: (asset === null || asset === void 0 ? void 0 : asset.value) || '',
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
            roomId: (room === null || room === void 0 ? void 0 : room.value) || '',
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
            tenantId: (tenant === null || tenant === void 0 ? void 0 : tenant.value) || ''
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
    },
    async deleteReceiptRecord(event) {
        const id = String(event.currentTarget.dataset.id || '');
        if (!id || this.data.deletingReceiptId) {
            return;
        }
        const confirmed = await wx.showModal({
            title: '删除收据',
            content: '删除后会解除对应账单的收据引用，该租约月份可重新开具。',
            confirmText: '删除',
            confirmColor: '#c0392b'
        });
        if (!confirmed.confirm) {
            return;
        }
        this.setData({
            deletingReceiptId: id
        });
        try {
            await (0, receipt_1.deleteReceipt)({ receiptId: id });
            wx.showToast({
                title: '已删除',
                icon: 'none'
            });
            await Promise.all([this.loadReceipts(), this.loadReceiptLeaseOptions()]);
        }
        catch (error) {
            console.error('delete receipt record failed', error);
            wx.showToast({
                title: '删除失败',
                icon: 'none'
            });
        }
        finally {
            this.setData({
                deletingReceiptId: ''
            });
        }
    }
});
