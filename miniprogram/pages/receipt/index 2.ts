import { createReceipt, deleteReceipt, exportReceiptPdf, getReceipt } from '../../services/receipt';

function buildReceiptShareTitle(receipt: Record<string, any> | null) {
  if (!receipt) {
    return '收款收据（非发票）';
  }

  return `${receipt.receiptNo || '收据'} ${receipt.tenantName || '租客'} 收款收据`;
}

function formatDateTime(value: unknown) {
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

function normalizeReceipt(receipt: Record<string, any>) {
  return {
    ...receipt,
    displayReceivedAt: formatDateTime(receipt.receivedAt),
    displayCreatedAt: formatDateTime(receipt.createdAt),
    items: Array.isArray(receipt.items)
      ? receipt.items.map((item: Record<string, any>) => ({
        ...item,
        displayReceivedAt: formatDateTime(item.receivedAt)
      }))
      : []
  };
}

function buildReceiptSummary(receipt: Record<string, any>) {
  return [
    '收款收据（非发票）',
    `收据编号：${receipt.receiptNo || ''}`,
    `房源/房间：${receipt.assetName || ''} / ${receipt.roomName || ''}`,
    `租客：${receipt.tenantName || ''}`,
    `合计金额：¥${receipt.totalAmount || 0}`,
    `收款日期：${receipt.displayReceivedAt || receipt.receivedAt || ''}`
  ].join('\n');
}

Page({
  data: {
    billId: '',
    receiptId: '',
    receipt: null as Record<string, any> | null,
    loading: true,
    exportingPdf: false,
    deleting: false
  },
  async onLoad(query: Record<string, string | undefined>) {
    this.setData({
      billId: String(query.billId || ''),
      receiptId: String(query.receiptId || '')
    });
    await this.loadReceipt();
  },
  async loadReceipt() {
    this.setData({
      loading: true
    });

    try {
      const receipt = this.data.receiptId
        ? await getReceipt({ receiptId: this.data.receiptId })
        : await createReceipt({ billIds: [this.data.billId] });
      const normalizedReceipt = normalizeReceipt(receipt as Record<string, any>);
      this.setData({
        receipt: normalizedReceipt,
        receiptId: String((receipt as Record<string, any>).id || '')
      });
    } catch (error) {
      console.error('load receipt failed', error);
      wx.showToast({
        title: '收据加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({
        loading: false
      });
    }
  },
  onShareAppMessage() {
    const receipt = this.data.receipt;
    const receiptId = String(this.data.receiptId || receipt?.id || '');

    return {
      title: buildReceiptShareTitle(receipt),
      path: receiptId ? `/pages/receipt/index?receiptId=${receiptId}` : '/pages/receipt/index'
    };
  },
  copyReceiptSummary() {
    if (!this.data.receipt) {
      return;
    }

    wx.setClipboardData({
      data: buildReceiptSummary(this.data.receipt),
      success: () => {
        wx.showToast({
          title: '摘要已复制，可保存凭证',
          icon: 'none'
        });
      }
    });
  },
  async exportPrintablePdf() {
    if (!this.data.receiptId || this.data.exportingPdf) {
      return;
    }

    this.setData({
      exportingPdf: true
    });

    try {
      const result = await exportReceiptPdf({ receiptId: this.data.receiptId }) as Record<string, any>;
      const fileID = String(result.fileID || '');
      if (!fileID) {
        wx.showToast({
          title: 'PDF已生成，请在真机云端下载',
          icon: 'none'
        });
        return;
      }

      const downloaded = await wx.cloud.downloadFile({ fileID });
      await wx.openDocument({
        filePath: downloaded.tempFilePath,
        fileType: 'pdf',
        showMenu: true
      });
    } catch (error) {
      console.error('export receipt pdf failed', error);
      wx.showToast({
        title: '导出PDF失败',
        icon: 'none'
      });
    } finally {
      this.setData({
        exportingPdf: false
      });
    }
  },
  async handleDeleteReceipt() {
    if (!this.data.receipt?.id || this.data.deleting) {
      return;
    }

    const confirmed = await wx.showModal({
      title: '删除收据',
      content: '删除后会解除账单上的收据引用，可重新开具该月收据。',
      confirmText: '删除',
      confirmColor: '#c0392b'
    });
    if (!confirmed.confirm) {
      return;
    }

    this.setData({
      deleting: true
    });

    try {
      await deleteReceipt({
        receiptId: this.data.receipt.id
      });
      wx.showToast({
        title: '已删除',
        icon: 'none'
      });
      wx.navigateBack();
    } catch (error) {
      console.error('delete receipt failed', error);
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      });
    } finally {
      this.setData({
        deleting: false
      });
    }
  }
});
