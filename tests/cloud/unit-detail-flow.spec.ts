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
});
