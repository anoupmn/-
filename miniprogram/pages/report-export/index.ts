import { listAssets } from '../../services/asset';
import { listRoomsByAsset } from '../../services/room';
import { createMonthlyReportExport, deleteReportExport, listReportExports } from '../../services/report-export';

function currentMonthKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

Page({
  data: {
    month: currentMonthKey(),
    rangeType: 'all',
    assets: [] as Array<Record<string, any>>,
    assetOptions: [] as string[],
    selectedAssetIndex: 0,
    rooms: [] as Array<Record<string, any>>,
    roomOptions: [] as string[],
    selectedRoomIndex: 0,
    exports: [] as Array<Record<string, any>>,
    exporting: false,
    loadingOptions: true,
    loadingExports: true,
    deletingExportId: '',
    result: null as Record<string, any> | null
  },
  async onShow() {
    await Promise.all([this.loadOptions(), this.loadExportRecords()]);
  },
  async loadOptions() {
    this.setData({
      loadingOptions: true
    });

    try {
      const assets = await listAssets() as Array<Record<string, any>>;
      this.setData({
        assets,
        assetOptions: assets.map((asset) => String(asset.name || '未命名房源')),
        selectedAssetIndex: 0,
        loadingOptions: false
      });
      await this.loadRoomsForSelectedAsset();
    } catch (error) {
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
    if (!asset?.id) {
      this.setData({
        rooms: [],
        roomOptions: [],
        selectedRoomIndex: 0
      });
      return;
    }

    const rooms = await listRoomsByAsset(String(asset.id)) as Array<Record<string, any>>;
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
      const response = await listReportExports() as { exports?: Array<Record<string, any>> };
      this.setData({
        exports: response.exports || [],
        loadingExports: false
      });
    } catch (error) {
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
  handleMonthChange(event: WechatMiniprogram.PickerChange) {
    this.setData({
      month: String(event.detail.value || currentMonthKey())
    });
  },
  handleRangeChange(event: WechatMiniprogram.RadioGroupChange) {
    this.setData({
      rangeType: String(event.detail.value || 'all')
    });
  },
  async handleAssetChange(event: WechatMiniprogram.PickerChange) {
    this.setData({
      selectedAssetIndex: Number(event.detail.value || 0)
    });
    await this.loadRoomsForSelectedAsset();
  },
  handleRoomChange(event: WechatMiniprogram.PickerChange) {
    this.setData({
      selectedRoomIndex: Number(event.detail.value || 0)
    });
  },
  async createExport() {
    if (this.data.exporting) {
      return;
    }

    const payload: Record<string, unknown> = {
      month: this.data.month
    };

    if (this.data.rangeType === 'asset') {
      const asset = this.data.assets[this.data.selectedAssetIndex];
      if (!asset?.id) {
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
      if (!room?.id) {
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
      const result = await createMonthlyReportExport(payload) as Record<string, any>;
      this.setData({
        result
      });
      await this.loadExportRecords();
      wx.showToast({
        title: '导出已生成',
        icon: 'success'
      });
    } catch (error) {
      console.error('create monthly report export failed', error);
      wx.showToast({
        title: '导出失败，请检查云函数',
        icon: 'none'
      });
    } finally {
      this.setData({
        exporting: false
      });
    }
  },
  async openExportFile() {
    const fileID = String(this.data.result?.fileID || '');
    await this.openFileByFileId(fileID);
  },
  async openExportRecord(event: WechatMiniprogram.BaseEvent) {
    const fileID = String(event.currentTarget.dataset.fileId || '');
    await this.openFileByFileId(fileID);
  },
  async openFileByFileId(fileID: string) {
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
    } catch (error) {
      console.error('open export file failed', error);
      wx.showToast({
        title: '打开文件失败',
        icon: 'none'
      });
    }
  },
  async deleteExportRecord(event: WechatMiniprogram.BaseEvent) {
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
      await deleteReportExport({ exportId });
      await this.loadExportRecords();
      wx.showToast({
        title: '已删除',
        icon: 'none'
      });
    } catch (error) {
      console.error('delete export record failed', error);
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      });
    } finally {
      this.setData({
        deletingExportId: ''
      });
    }
  }
});
