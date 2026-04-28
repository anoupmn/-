import { createMonthlyReportExport } from '../../services/report-export';

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
    assetId: '',
    roomId: '',
    exporting: false,
    result: null as Record<string, any> | null
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
  handleInput(event: WechatMiniprogram.Input) {
    const field = String(event.currentTarget.dataset.field || '');
    if (!field) {
      return;
    }

    this.setData({
      [field]: event.detail.value
    });
  },
  async createExport() {
    if (this.data.exporting) {
      return;
    }

    const payload: Record<string, unknown> = {
      month: this.data.month
    };

    if (this.data.rangeType === 'asset' && this.data.assetId.trim()) {
      payload.assetId = this.data.assetId.trim();
    }

    if (this.data.rangeType === 'room' && this.data.roomId.trim()) {
      payload.roomId = this.data.roomId.trim();
    }

    this.setData({
      exporting: true
    });

    try {
      const result = await createMonthlyReportExport(payload) as Record<string, any>;
      this.setData({
        result
      });
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
  }
});
