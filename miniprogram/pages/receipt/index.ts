import { createReceipt, getReceipt, voidReceipt } from '../../services/receipt';

function buildReceiptShareTitle(receipt: Record<string, any> | null) {
  if (!receipt) {
    return '收款收据（非发票）';
  }

  return `${receipt.receiptNo || '收据'} ${receipt.tenantName || '租客'} 收款收据`;
}

function buildReceiptSummary(receipt: Record<string, any>) {
  const statusLabel = receipt.status === 'voided' ? '已作废' : '有效';
  return [
    '收款收据（非发票）',
    `收据编号：${receipt.receiptNo || ''}`,
    `房源/房间：${receipt.assetName || ''} / ${receipt.roomName || ''}`,
    `租客：${receipt.tenantName || ''}`,
    `合计金额：¥${receipt.totalAmount || 0}`,
    `收款日期：${receipt.receivedAt || ''}`,
    `状态：${statusLabel}`
  ].join('\n');
}

Page({
  data: {
    billId: '',
    receiptId: '',
    receipt: null as Record<string, any> | null,
    loading: true,
    voiding: false,
    voidDialogVisible: false,
    voidReason: ''
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
      this.setData({
        receipt: receipt as Record<string, any>,
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
  openVoidDialog() {
    if (!this.data.receipt?.id || this.data.voiding) {
      return;
    }

    this.setData({
      voidDialogVisible: true,
      voidReason: ''
    });
  },
  closeVoidDialog() {
    if (this.data.voiding) {
      return;
    }

    this.setData({
      voidDialogVisible: false,
      voidReason: ''
    });
  },
  handleVoidReasonInput(event: WechatMiniprogram.Input) {
    this.setData({
      voidReason: event.detail.value
    });
  },
  async handleVoidReceipt() {
    if (!this.data.receipt?.id || this.data.voiding) {
      return;
    }

    const voidReason = String(this.data.voidReason || '').trim();
    if (!voidReason) {
      wx.showToast({
        title: '请输入作废原因',
        icon: 'none'
      });
      return;
    }

    this.setData({
      voiding: true
    });

    try {
      const receipt = await voidReceipt({
        receiptId: this.data.receipt.id,
        voidReason
      });
      this.setData({
        receipt: receipt as Record<string, any>,
        voidDialogVisible: false,
        voidReason: ''
      });
      wx.showToast({
        title: '已作废',
        icon: 'none'
      });
    } catch (error) {
      console.error('void receipt failed', error);
      wx.showToast({
        title: '作废失败',
        icon: 'none'
      });
    } finally {
      this.setData({
        voiding: false
      });
    }
  },
  async handleReissueReceipt() {
    if (!this.data.receipt?.id) {
      return;
    }

    try {
      const receipt = await createReceipt({
        billIds: this.data.receipt.billIds,
        reissueFromReceiptId: this.data.receipt.id
      });
      this.setData({
        receipt: receipt as Record<string, any>,
        receiptId: String((receipt as Record<string, any>).id || '')
      });
      wx.showToast({
        title: '已重开',
        icon: 'success'
      });
    } catch (error) {
      console.error('reissue receipt failed', error);
      wx.showToast({
        title: '重开失败',
        icon: 'none'
      });
    }
  }
});
