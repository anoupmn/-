---
phase: 02
slug: billing-status-view
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-03
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 30.x + ts-jest |
| **Config file** | `jest.config.cjs` |
| **Quick run command** | `npm test -- --runInBand --runTestsByPath <targeted spec files>` |
| **Full suite command** | `npm test -- --runInBand && npm run typecheck` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --runInBand --runTestsByPath <targeted spec files>`
- **After every plan wave:** Run `npm test -- --runInBand && npm run typecheck`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | BILL-01 | unit | `npm test -- --runInBand --runTestsByPath tests/domain/bill-status.spec.ts tests/domain/rentable-unit-status.spec.ts` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | BILL-03 | cloud | `npm test -- --runInBand --runTestsByPath tests/cloud/bills-sync.spec.ts tests/cloud/leases-save-billing.spec.ts` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 2 | BILL-02 | cloud | `npm test -- --runInBand --runTestsByPath tests/cloud/bills-receive.spec.ts tests/cloud/rentable-unit-detail-billing.spec.ts` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 2 | ASST-04 | cloud | `npm test -- --runInBand --runTestsByPath tests/cloud/rentable-units-list-status.spec.ts` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 3 | LIST-02 | integration | `npm run typecheck` | ✅ | ⬜ pending |
| 02-03-02 | 03 | 3 | BILL-04 | integration | `npm test -- --runInBand --runTestsByPath tests/cloud/rentable-unit-detail-billing.spec.ts && npm run typecheck` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/domain/bill-status.spec.ts` — fee status and receipt-state coverage
- [ ] `tests/domain/rentable-unit-status.spec.ts` — main-status and risk-tag coverage
- [ ] `tests/cloud/bills-sync.spec.ts` — bill generation and regeneration coverage
- [ ] `tests/cloud/leases-save-billing.spec.ts` — lease-save to bill-sync linkage coverage
- [ ] `tests/cloud/bills-receive.spec.ts` — receipt registration coverage
- [ ] `tests/cloud/rentable-unit-detail-billing.spec.ts` — detail aggregation coverage
- [ ] `tests/cloud/rentable-units-list-status.spec.ts` — list summary status coverage

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 摘要卡第一屏信息层级符合 UI-SPEC | LIST-02 | Jest 不能验证小程序视觉层级和折叠默认态 | 打开单元详情，确认摘要卡先于历史区，且历史区默认折叠 |
| 风险标签文案不是只靠颜色表达 | ASST-04 | 自动化无法可靠检查真实渲染感受 | 在列表与详情查看“即将到期 / 已逾期 / 异常”标签是否带文字 |
| `登记收款` 与 `结束租约` 的视觉区分 | LIST-02 | 属于交互可用性检查 | 打开详情页，确认主动作和 destructive 动作样式明显不同 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-03
