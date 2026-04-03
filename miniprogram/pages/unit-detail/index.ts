import { endLease } from '../../services/lease';
import { receiveBill } from '../../services/bill';
import { getRentableUnitDetail } from '../../services/rentable-unit';

type FeeSectionItem = {
  id: string;
  label: string;
  dueDate: string;
  amount: number;
  status: string;
  receivedAt?: string | null;
};

type DetailPayload = Record<string, any> & {
  feeSections?: Array<{
    key: string;
    title: string;
    items: FeeSectionItem[];
  }>;
  historyCollapsedByDefault?: boolean;
};

function formatStatusLabel(status: string) {
  const mapping: Record<string, string> = {
    pending: '待收',
    due_today: '今日到期',
    paid: '已收',
    overdue: '逾期'
  };

  return mapping[status] ?? status;
}

Page({
  data: {
    roomId: '',
    detail: null as DetailPayload | null,
    historyCollapsed: true
  },
  async loadDetail(roomId?: string) {
    const nextRoomId = roomId ?? this.data.roomId;
    const detail = (await getRentableUnitDetail({ roomId: nextRoomId })) as DetailPayload;
    const feeSections = (detail.feeSections ?? []).map((section) => ({
      ...section,
      items: section.items.map((item) => ({
        ...item,
        statusLabel: formatStatusLabel(item.status)
      }))
    }));

    this.setData({
      roomId: nextRoomId,
      detail: {
        ...detail,
        feeSections
      },
      historyCollapsed: detail.historyCollapsedByDefault ?? true
    });
  },
  async onLoad(query: Record<string, string>) {
    const roomId = query.roomId;
    await this.loadDetail(roomId);
  },
  toggleHistory() {
    this.setData({
      historyCollapsed: !this.data.historyCollapsed
    });
  },
  async handleReceiveBill(event: WechatMiniprogram.BaseEvent) {
    const billId = event.currentTarget.dataset.billId as string;
    const receivedAmount = Number(event.currentTarget.dataset.amount || 0);

    if (!billId || !receivedAmount) {
      return;
    }

    await receiveBill({
      billId,
      receivedAt: new Date().toISOString(),
      receivedAmount
    });
    wx.showToast({
      title: '已登记收款',
      icon: 'success'
    });
    await this.loadDetail();
  },
  handleViewAllBills() {
    wx.showToast({
      title: '当前页面已展示全部账单',
      icon: 'none'
    });
  },
  async handleEndLease() {
    const leaseId = this.data.detail?.activeLease?.id;
    if (!leaseId) {
      return;
    }

    const confirmation = await wx.showModal({
      title: '结束租约',
      content: '确认结束当前租约后，单元状态会重新计算，历史记录会保留。'
    });

    if (!confirmation.confirm) {
      return;
    }

    await endLease({ leaseId });
    wx.showToast({
      title: '租约已结束',
      icon: 'success'
    });
    await wx.navigateBack();
  }
});
