---
phase: 05
slug: feiyong-yu-zhangdan-moxing-youhua
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-27
---

# Phase 05 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest + ts-jest |
| **Config file** | `jest.config.cjs` |
| **Quick run command** | `npm test -- --runTestsByPath tests/cloud/bills-sync.spec.ts tests/cloud/bills-save.spec.ts tests/cloud/repair-record-save.spec.ts --runInBand` |
| **Full suite command** | `npm test -- --runInBand && npm run typecheck` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run the task-specific `npm test -- --runTestsByPath ... --runInBand` command listed below.
- **After every plan wave:** Run `npm test -- --runInBand`.
- **Before `$gsd-verify-work`:** `npm test -- --runInBand && npm run typecheck` must be green.
- **Max feedback latency:** 90 seconds for targeted task tests, 180 seconds for full suite plus typecheck.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-00-01 | 00 | 0 | CORR-01 | integration | `npm test -- --runTestsByPath tests/cloud/bills-sync.spec.ts tests/cloud/leases-save-billing.spec.ts --runInBand` | No | pending |
| 05-00-02 | 00 | 0 | FEE-01/FEE-03/FEE-04 | integration | `npm test -- --runTestsByPath tests/cloud/bills-sync.spec.ts tests/cloud/leases-save-billing.spec.ts --runInBand` | No | pending |
| 05-00-03 | 00 | 0 | FEE-02 | unit | `npm test -- --runTestsByPath tests/domain/bill-status.spec.ts tests/domain/rentable-unit-summary.spec.ts --runInBand` | No | pending |
| 05-00-04 | 00 | 0 | UTIL-01/UTIL-02 | integration | `npm test -- --runTestsByPath tests/cloud/bills-save.spec.ts tests/cloud/rentable-unit-detail-billing.spec.ts --runInBand` | No | pending |
| 05-00-05 | 00 | 0 | OPEX-01/OPEX-02 | integration | `npm test -- --runTestsByPath tests/cloud/owner-expense-save.spec.ts tests/cloud/alerts-list.spec.ts --runInBand` | No | pending |
| 05-00-06 | 00 | 0 | CORR-02 | integration | `npm test -- --runTestsByPath tests/cloud/leases-delete.spec.ts --runInBand` | No | pending |
| 05-00-07 | 00 | 0 | D-04/D-06 | integration | `npm test -- --runTestsByPath tests/cloud/dashboard-home.spec.ts tests/cloud/alerts-list.spec.ts --runInBand` | Partial | pending |
| 05-01-01 | 01 | 1 | CORR-01/D-01/D-04/D-06 | integration | `npm test -- --runTestsByPath tests/cloud/bills-sync.spec.ts tests/cloud/leases-save-billing.spec.ts tests/cloud/dashboard-home.spec.ts tests/cloud/alerts-list.spec.ts --runInBand` | Wave 0 | pending |
| 05-02-01 | 02 | 2 | FEE-01/FEE-02/FEE-03/FEE-04 | integration | `npm test -- --runTestsByPath tests/cloud/bills-sync.spec.ts tests/cloud/leases-save-billing.spec.ts tests/domain/bill-status.spec.ts tests/domain/rentable-unit-summary.spec.ts --runInBand` | Wave 0 | pending |
| 05-03-01 | 03 | 3 | UTIL-01/UTIL-02 | integration | `npm test -- --runTestsByPath tests/cloud/bills-save.spec.ts tests/cloud/rentable-unit-detail-billing.spec.ts --runInBand` | Wave 0 | pending |
| 05-04-01 | 04 | 4 | OPEX-01/OPEX-02 | integration | `npm test -- --runTestsByPath tests/cloud/owner-expense-save.spec.ts tests/cloud/repair-record-save.spec.ts tests/cloud/alerts-list.spec.ts --runInBand` | Wave 0 | pending |
| 05-05-01 | 05 | 5 | CORR-02 | integration | `npm test -- --runTestsByPath tests/cloud/leases-delete.spec.ts tests/cloud/unit-detail-flow.spec.ts --runInBand` | Wave 0 | pending |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

- [ ] `tests/cloud/leases-save-billing.spec.ts` — covers lease edit preserving received bills and manual bills.
- [ ] `tests/domain/bill-status.spec.ts` — covers deposit-like bills not becoming overdue.
- [ ] `tests/domain/rentable-unit-summary.spec.ts` — covers deposit-like bills excluded from next-rent core prompt.
- [ ] `tests/cloud/rentable-unit-detail-billing.spec.ts` — covers water/electricity defaults and billing display contract.
- [ ] `tests/cloud/owner-expense-save.spec.ts` — covers owner expense creation, optional amount, repair link, and non-repair exclusion from repair anomaly stats.
- [ ] `tests/cloud/leases-delete.spec.ts` — covers blocker summary and deletion of unpaid system bills only.
- [ ] `tests/cloud/dashboard-home.spec.ts` / `tests/cloud/alerts-list.spec.ts` — assert one landlord's alert rebuild does not delete another landlord's alerts.
- [ ] `tests/helpers/mock-cloud.ts` — adds `ownerExpenses` collection mapping and `_id !== id` fixtures where repository helpers rely on business ids.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 租约表单固定费用录入 | FEE-01/FEE-03/FEE-04 | 微信小程序表单交互需要开发者工具确认 | 在微信开发者工具中新建/编辑租约，确认租金、押金、管理费、消防押金、锁卡押金、自定义费用性质均可录入并保存。 |
| 单元详情水电补录 | UTIL-01/UTIL-02 | 默认读数、备注和服务端金额展示需要页面联调 | 在单元详情补录水费和电费，确认默认上期读数/单价、备注、服务端计算金额和月度账单展示一致。 |
| 记录维修/支出入口 | OPEX-01/OPEX-02 | 入口文案和分类可用性需要人工确认 | 在单元详情记录维修、保洁、打理三类支出，确认只有维修类进入问题分析，所有支出按发生日期保留。 |
| 租约安全删除与结束租约提示 | CORR-02 | 二次确认、blocker 文案和用户选择需要人工确认 | 对无历史关联租约尝试删除；对已有收款/维修/支出关联租约尝试删除，确认阻止硬删除并提示编辑、更正、结束或作废。 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers all missing references.
- [x] No watch-mode flags.
- [x] Feedback latency < 180s.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** pending
