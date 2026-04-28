import fs from 'fs';

describe('unit detail correction flow wiring', () => {
  it('wires deleteLease and lease ending recovery copy', () => {
    const serviceSource = fs.readFileSync('miniprogram/services/lease.ts', 'utf8');
    const pageSource = fs.readFileSync('miniprogram/pages/unit-detail/index.ts', 'utf8');
    const wxmlSource = fs.readFileSync('miniprogram/pages/unit-detail/index.wxml', 'utf8');
    const combined = `${serviceSource}\n${pageSource}\n${wxmlSource}`;

    expect(combined).toContain('deleteLease');
    expect(combined).toContain('保留欠款');
    expect(combined).toContain('作废未收系统账单');
    expect(combined).toContain('修改截止日期后重算');
  });

  it('wires year billing folds and renewal entry through lease form', () => {
    const pageSource = fs.readFileSync('miniprogram/pages/unit-detail/index.ts', 'utf8');
    const wxmlSource = fs.readFileSync('miniprogram/pages/unit-detail/index.wxml', 'utf8');
    const formSource = fs.readFileSync('miniprogram/pages/leases-form/index.ts', 'utf8');
    const combined = `${pageSource}\n${wxmlSource}\n${formSource}`;

    expect(combined).toContain('yearBillGroups');
    expect(combined).toContain('toggleYear');
    expect(pageSource).toContain('renewDialogVisible');
    expect(wxmlSource).toContain('续租到期');
    expect(wxmlSource).toContain('周期性自定义费用');
    expect(pageSource).toContain('resolveRenewFeeRules');
    expect(wxmlSource).toContain('不会重复收押金、消防押金、锁卡押金和一次性费用');
    expect(pageSource).toContain('saveLease');
    expect(combined).not.toContain('/pages/leases-form/index?mode=renew');
  });

  it('wires receipt entry and monthly export through ops tab without data reset', () => {
    const appJson = fs.readFileSync('miniprogram/app.json', 'utf8');
    const opsSource = fs.readFileSync('miniprogram/pages/ops/index.ts', 'utf8');
    const opsWxml = fs.readFileSync('miniprogram/pages/ops/index.wxml', 'utf8');
    const reportExportSource = fs.readFileSync('miniprogram/pages/report-export/index.ts', 'utf8');
    const reportExportWxml = fs.readFileSync('miniprogram/pages/report-export/index.wxml', 'utf8');
    const detailSource = fs.readFileSync('miniprogram/pages/unit-detail/index.ts', 'utf8');
    const detailWxml = fs.readFileSync('miniprogram/pages/unit-detail/index.wxml', 'utf8');
    const receiptWxml = fs.readFileSync('miniprogram/pages/receipt/index.wxml', 'utf8');
    const combined = `${appJson}\n${opsSource}\n${opsWxml}\n${reportExportSource}\n${reportExportWxml}\n${detailSource}\n${detailWxml}\n${receiptWxml}`;

    expect(combined).toContain('pages/report-export/index');
    expect(opsWxml).toContain('月度经营导出');
    expect(reportExportSource).toContain('listAssets');
    expect(reportExportSource).toContain('listRoomsByAsset');
    expect(reportExportSource).toContain('listReportExports');
    expect(reportExportSource).toContain('deleteReportExport');
    expect(reportExportWxml).toContain('选择房源');
    expect(reportExportWxml).toContain('选择房间');
    expect(reportExportWxml).toContain('导出记录');
    expect(reportExportWxml).not.toContain('请输入房源 ID');
    expect(reportExportWxml).not.toContain('请输入房间 ID');
    expect(detailWxml).toContain('开具本租约本月收据');
    expect(detailWxml).toContain('查看本月收据');
    expect(receiptWxml).toContain('收款收据（非发票）');
    expect(receiptWxml).toContain('作废收据');
    expect(receiptWxml).toContain('重开收据');
    expect(combined).not.toContain('data-reset');
    expect(combined).not.toContain('测试数据重置');
  });

  it('wires receipt records page through ops tab', () => {
    const appJson = fs.readFileSync('miniprogram/app.json', 'utf8');
    const opsWxml = fs.readFileSync('miniprogram/pages/ops/index.wxml', 'utf8');
    const receiptRecordsSource = fs.readFileSync('miniprogram/pages/receipt-records/index.ts', 'utf8');
    const receiptRecordsWxml = fs.readFileSync('miniprogram/pages/receipt-records/index.wxml', 'utf8');
    const serviceSource = fs.readFileSync('miniprogram/services/receipt.ts', 'utf8');

    expect(appJson).toContain('pages/receipt-records/index');
    expect(opsWxml).toContain('收据记录');
    expect(opsWxml).toContain('/pages/receipt-records/index');
    expect(receiptRecordsSource).toContain('listReceiptRecords');
    expect(receiptRecordsSource).toContain('listReceiptLeaseOptions');
    expect(receiptRecordsSource).toContain('createReceipt');
    expect(serviceSource).toContain('receipt-list');
    expect(serviceSource).toContain('receipt-lease-options');
    expect(receiptRecordsWxml).toContain('全部月份');
    expect(receiptRecordsWxml).toContain('按租约开收据');
    expect(receiptRecordsWxml).toContain('开具该租约本月收据');
    expect(receiptRecordsWxml).toContain('全部');
    expect(receiptRecordsWxml).toContain('有效');
    expect(receiptRecordsWxml).toContain('已作废');
    expect(receiptRecordsWxml).toContain('查看收据');
    expect(receiptRecordsWxml).toContain('回到房间');
    expect(receiptRecordsWxml).toContain('暂无符合条件的收据');
    expect(receiptRecordsWxml).not.toContain('receiptId:');
    expect(receiptRecordsWxml).not.toContain('billIds');
  });

  it('wires merged receipt creation from unit detail without exposing bill ids', () => {
    const detailSource = fs.readFileSync('miniprogram/pages/unit-detail/index.ts', 'utf8');
    const detailWxml = fs.readFileSync('miniprogram/pages/unit-detail/index.wxml', 'utf8');
    const receiptCreateSource = fs.readFileSync('cloudfunctions/receipt-create/index.ts', 'utf8');
    const receiptRepositorySource = fs.readFileSync('cloudfunctions/shared/repositories/receipt-repository.ts', 'utf8');
    const combined = `${detailSource}\n${detailWxml}\n${receiptCreateSource}\n${receiptRepositorySource}`;

    expect(detailWxml).toContain('开具本租约本月收据');
    expect(detailWxml).toContain('查看本月收据');
    expect(detailWxml).not.toContain('生成收据');
    expect(detailWxml).not.toContain('已开具收据');
    expect(detailSource).not.toContain('openReceiptPage');
    expect(detailSource).toContain('收据已生成');
    expect(detailSource).toContain('createReceipt({ leaseId, month })');
    expect(combined).toMatch(/month.*leaseId|leaseId.*month/);
    expect(receiptRepositorySource).toContain('already has an active receipt');
    expect(detailWxml).not.toContain('billId:');
  });

  it('requires a typed void reason and shows reissue trace copy', () => {
    const receiptSource = fs.readFileSync('miniprogram/pages/receipt/index.ts', 'utf8');
    const receiptWxml = fs.readFileSync('miniprogram/pages/receipt/index.wxml', 'utf8');
    const receiptRepositorySource = fs.readFileSync('cloudfunctions/shared/repositories/receipt-repository.ts', 'utf8');
    const combined = `${receiptSource}\n${receiptWxml}\n${receiptRepositorySource}`;

    expect(receiptWxml).toContain('填写作废原因');
    expect(receiptWxml).toContain('textarea');
    expect(receiptWxml).toContain('请输入作废原因');
    expect(receiptWxml).toContain('作废原因');
    expect(receiptWxml).toContain('作废时间');
    expect(receiptWxml).toContain('由作废收据重开');
    expect(receiptWxml).toContain('重开收据');
    expect(receiptSource).toContain('voidReason');
    expect(receiptSource).toContain('trim()');
    expect(receiptRepositorySource).toContain('voidReason is required');
    expect(combined).not.toContain('用户作废重开');
  });

  it('renders receipt as a formal voucher with pdf share and copy fallbacks', () => {
    const receiptSource = fs.readFileSync('miniprogram/pages/receipt/index.ts', 'utf8');
    const receiptWxml = fs.readFileSync('miniprogram/pages/receipt/index.wxml', 'utf8');
    const receiptPdfSource = fs.readFileSync('cloudfunctions/receipt-pdf/index.ts', 'utf8');
    const combined = `${receiptSource}\n${receiptWxml}`;

    expect(combined).toContain('收款收据（非发票）');
    expect(receiptWxml).toContain('收据编号');
    expect(receiptWxml).toContain('收款日期');
    expect(receiptWxml).toContain('收款项目明细');
    expect(receiptWxml).toContain('实收日期');
    expect(receiptWxml).toContain('合计金额');
    expect(receiptWxml).toContain('收款人');
    expect(receiptWxml).toContain('生成时间');
    expect(receiptWxml).toContain('导出PDF打印版');
    expect(receiptWxml).toContain('复制收据摘要');
    expect(receiptWxml).toContain('分享凭证');
    expect(receiptSource).toContain('exportReceiptPdf');
    expect(receiptSource).toContain('openDocument');
    expect(receiptSource).toContain('保存凭证');
    expect(receiptSource).toContain('onShareAppMessage');
    expect(receiptSource).toContain('/pages/receipt/index?receiptId=');
    expect(receiptSource).toContain('setClipboardData');
    expect(receiptPdfSource).toContain('application/pdf');
    expect(receiptPdfSource).toContain('STSong-Light');
    expect(receiptWxml).not.toContain('receiptId:');
    expect(combined).not.toMatch(/jspdf|pdfmake/);
  });
});
