---
phase: 06
slug: yuedu-daochu-yu-shouju
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-28
---

# Phase 06 — Validation Strategy

> Per-phase validation contract for monthly export and receipt execution.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest + ts-jest |
| **Config file** | `jest.config.cjs` |
| **Quick run command** | `npm test -- --runTestsByPath tests/cloud/report-export-create.spec.ts tests/cloud/receipt-create.spec.ts tests/cloud/receipt-void.spec.ts --runInBand` |
| **Full suite command** | `npm test -- --runInBand && npm run typecheck` |
| **Estimated runtime** | ~90 seconds |

## Sampling Rate

- **After every task commit:** Run the task-specific command in the plan.
- **After every plan wave:** Run `npm test -- --runInBand`.
- **Before phase verification:** `npm test -- --runInBand && npm run typecheck` must be green.
- **Max feedback latency:** 90 seconds for targeted tests, 180 seconds for full suite plus typecheck.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | EXPT-01/EXPT-02/EXPT-03 | unit | `npm test -- --runTestsByPath tests/cloud/report-export-create.spec.ts --runInBand` | No | pending |
| 06-01-02 | 01 | 1 | RCPT-01/RCPT-02 | unit | `npm test -- --runTestsByPath tests/cloud/receipt-create.spec.ts tests/cloud/receipt-void.spec.ts --runInBand` | No | pending |
| 06-02-01 | 02 | 2 | EXPT-01 | integration | `npm test -- --runTestsByPath tests/cloud/report-export-create.spec.ts --runInBand` | Plan 01 | pending |
| 06-02-02 | 02 | 2 | EXPT-02/EXPT-03 | integration | `npm test -- --runTestsByPath tests/cloud/report-export-create.spec.ts --runInBand` | Plan 01 | pending |
| 06-03-01 | 03 | 3 | RCPT-01 | integration | `npm test -- --runTestsByPath tests/cloud/receipt-create.spec.ts --runInBand` | Plan 01 | pending |
| 06-03-02 | 03 | 3 | RCPT-02 | integration | `npm test -- --runTestsByPath tests/cloud/receipt-create.spec.ts tests/cloud/receipt-void.spec.ts tests/cloud/leases-delete.spec.ts --runInBand` | Plan 01 | pending |
| 06-04-01 | 04 | 4 | EXPT-01/RCPT-01 | static/integration | `npm test -- --runTestsByPath tests/cloud/unit-detail-flow.spec.ts --runInBand` | Existing | pending |
| 06-04-02 | 04 | 4 | EXPT-01/EXPT-02/EXPT-03/RCPT-01/RCPT-02 | regression | `npm test -- --runInBand && npm run typecheck` | Existing | pending |

*Status: pending · green · red · flaky*

## Wave 0 Requirements

- [ ] `tests/cloud/report-export-create.spec.ts` covers month filtering, asset/room filtering, required sheet names, monthly row shape, tenant income total excluding owner expenses, and meter reading columns.
- [ ] `tests/cloud/receipt-create.spec.ts` covers paid tenant bills only, snapshot immutability, receipt numbering, bill `receiptId` linking, and rejection of owner expenses/unpaid bills.
- [ ] `tests/cloud/receipt-void.spec.ts` covers voiding without deleting receipt or bill history, void reason, and reissue linkage.
- [ ] `tests/helpers/mock-cloud.ts` supports any cloud storage or uploadFile mock needed by `report-export-create`.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 月度导出入口 | EXPT-01 | 微信小程序文件保存/打开能力需要开发者工具确认 | 在“我的”或“业务维护”进入月度导出，选择月份、全部/房源/房间范围，确认生成文件可打开。 |
| Excel 可读性 | EXPT-02/EXPT-03 | 样式、列宽、中文表头需要人工看文件 | 打开导出的 XLSX，确认 `月度明细`、`账单明细`、`房东支出明细`、`退租支出明细` 均存在，标题和金额口径可核对。 |
| 收据预览 | RCPT-01 | 纸质凭证心智需要人工确认 | 在单元详情从已收账单生成收据，确认标注“收款收据（非发票）”、项目明细、合计和收款日期展示清楚。 |
| 作废重开 | RCPT-02 | 作废确认与历史追溯需要人工确认 | 作废一张收据后重新生成，确认旧收据仍可查看且标记作废，新收据有新编号并关联旧收据。 |

## Validation Sign-Off

- [x] All tasks have automated verification or explicit manual verification.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers all missing test files.
- [x] No watch-mode flags.
- [x] Feedback latency target < 180s.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** pending
