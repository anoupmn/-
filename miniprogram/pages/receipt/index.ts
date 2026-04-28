import { createReceipt, getReceipt, voidReceipt } from '../../services/receipt';

Page({
  data: {
    billId: '',
    receiptId: '',
    receipt: null as Record<string, any> | null,
    loading: true,
    voiding: false
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
  async handleVoidReceipt() {
    if (!this.data.receipt?.id || this.data.voiding) {
      return;
    }

    const confirm = await wx.showModal({
      title: '作废收据',
      content: '作废后旧收据仍会保留，只能重新开具新收据。',
      confirmText: '确认作废',
      confirmColor: '#c0392b'
    });

    if (!confirm.confirm) {
      return;
    }

    this.setData({
      voiding: true
    });

    try {
      const receipt = await voidReceipt({
        receiptId: this.data.receipt.id,
        voidReason: '用户作废重开'
      });
      this.setData({
        receipt: receipt as Record<string, any>
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
