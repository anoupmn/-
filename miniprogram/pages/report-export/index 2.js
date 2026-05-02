"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const asset_1 = require("../../services/asset");
const room_1 = require("../../services/room");
const report_export_1 = require("../../services/report-export");
function currentMonthKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}
function formatDateTime(value) {
    const source = String(value || '').trim();
    if (!source) {
        return '';
    }
    const matched = source.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/);
    if (matched) {
        return `${matched[1]} ${matched[2]}`;
    }
    return source.replace('T', ' ').replace(/\.\d{3}Z?$/, '').replace(/Z$/, '');
}
function normalizeExportRecords(records) {
    return records.map((record) => ({
        ...record,
        displayCreatedAt: formatDateTime(record.createdAt)
    }));
}
Page({
    data: {
        month: currentMonthKey(),
        rangeType: 'all',
        assets: [],
        assetOptions: [],
        selectedAssetIndex: 0,
        rooms: [],
        roomOptions: [],
        selectedRoomIndex: 0,
        exports: [],
        exporting: false,
        loadingOptions: true,
        loadingExports: true,
        deletingExportId: '',
        result: null
    },
    async onShow() {
        await Promise.all([this.loadOptions(), this.loadExportRecords()]);
    },
    async loadOptions() {
        this.setData({
            loadingOptions: true
        });
        try {
            const assets = await (0, asset_1.listAssets)();
            this.setData({
                assets,
                assetOptions: assets.map((asset) => String(asset.name || '未命名房源')),
                selectedAssetIndex: 0,
                loadingOptions: false
            });
            await this.loadRoomsForSelectedAsset();
        }
        catch (error) {
            console.error('load report export options failed', error);
            this.setData({
                loadingOptions: false
            });
            wx.showToast({
                title: '加载房源失败',
                icon: 'none'
            });
        }
    },
    async loadRoomsForSelectedAsset() {
        const asset = this.data.assets[this.data.selectedAssetIndex];
        if (!(asset === null || asset === void 0 ? void 0 : asset.id)) {
            this.setData({
                rooms: [],
                roomOptions: [],
                selectedRoomIndex: 0
            });
            return;
        }
        const rooms = await (0, room_1.listRoomsByAsset)(String(asset.id));
        this.setData({
            rooms,
            roomOptions: rooms.map((room) => String(room.name || '未命名房间')),
            selectedRoomIndex: 0
        });
    },
    async loadExportRecords() {
        this.setData({
            loadingExports: true
        });
        try {
            const response = await (0, report_export_1.listReportExports)();
            this.setData({
                exports: normalizeExportRecords(response.exports || []),
                loadingExports: false
            });
        }
        catch (error) {
            console.error('load report export records failed', error);
            this.setData({
                loadingExports: false
            });
            wx.showToast({
                title: '加载导出记录失败',
                icon: 'none'
            });
        }
    },
    handleMonthChange(event) {
        this.setData({
            month: String(event.detail.value || currentMonthKey())
        });
    },
    handleRangeChange(event) {
        this.setData({
            rangeType: String(event.detail.value || 'all')
        });
    },
    async handleAssetChange(event) {
        this.setData({
            selectedAssetIndex: Number(event.detail.value || 0)
        });
        await this.loadRoomsForSelectedAsset();
    },
    handleRoomChange(event) {
        this.setData({
            selectedRoomIndex: Number(event.detail.value || 0)
        });
    },
    async createExport() {
        if (this.data.exporting) {
            return;
        }
        const payload = {
            month: this.data.month
        };
        if (this.data.rangeType === 'asset') {
            const asset = this.data.assets[this.data.selectedAssetIndex];
            if (!(asset === null || asset === void 0 ? void 0 : asset.id)) {
                wx.showToast({
                    title: '请选择房源',
                    icon: 'none'
                });
                return;
            }
            payload.assetId = String(asset.id);
        }
        if (this.data.rangeType === 'room') {
            const room = this.data.rooms[this.data.selectedRoomIndex];
            if (!(room === null || room === void 0 ? void 0 : room.id)) {
                wx.showToast({
                    title: '请选择房间',
                    icon: 'none'
                });
                return;
            }
            payload.roomId = String(room.id);
        }
        this.setData({
            exporting: true
        });
        try {
            const result = await (0, report_export_1.createMonthlyReportExport)(payload);
            this.setData({
                result
            });
            await this.loadExportRecords();
            wx.showToast({
                title: '导出已生成',
                icon: 'success'
            });
        }
        catch (error) {
            console.error('create monthly report export failed', error);
            wx.showToast({
                title: '导出失败，请检查云函数',
                icon: 'none'
            });
        }
        finally {
            this.setData({
                exporting: false
            });
        }
    },
    async openExportFile() {
        var _a;
        const fileID = String(((_a = this.data.result) === null || _a === void 0 ? void 0 : _a.fileID) || '');
        await this.openFileByFileId(fileID);
    },
    async openExportRecord(event) {
        const fileID = String(event.currentTarget.dataset.fileId || '');
        await this.openFileByFileId(fileID);
    },
    async openFileByFileId(fileID) {
        if (!fileID) {
            wx.showToast({
                title: '暂无可打开文件',
                icon: 'none'
            });
            return;
        }
        try {
            const downloadResult = await wx.cloud.downloadFile({ fileID });
            await wx.openDocument({
                filePath: downloadResult.tempFilePath,
                fileType: 'xlsx',
                showMenu: true
            });
        }
        catch (error) {
            console.error('open export file failed', error);
            wx.showToast({
                title: '打开文件失败',
                icon: 'none'
            });
        }
    },
    async deleteExportRecord(event) {
        const exportId = String(event.currentTarget.dataset.exportId || '');
        if (!exportId || this.data.deletingExportId) {
            return;
        }
        const confirm = await wx.showModal({
            title: '删除导出记录',
            content: '会删除这条导出记录；如文件已上传，也会尝试删除对应云文件。',
            confirmText: '删除',
            confirmColor: '#c0392b'
        });
        if (!confirm.confirm) {
            return;
        }
        this.setData({
            deletingExportId: exportId
        });
        try {
            await (0, report_export_1.deleteReportExport)({ exportId });
            await this.loadExportRecords();
            wx.showToast({
                title: '已删除',
                icon: 'none'
            });
        }
        catch (error) {
            console.error('delete export record failed', error);
            wx.showToast({
                title: '删除失败',
                icon: 'none'
            });
        }
        finally {
            this.setData({
                deletingExportId: ''
            });
        }
    }
});
