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
});
