---
phase: 02-账单与房态视图
plan: 02
subsystem: api
tags: [receipt-action, list-query, detail-query]
requires:
  - phase: 02-01
    provides: bill ledger 与共享状态计算
provides:
  - bills-receive 收款登记云函数
  - rentable-unit-detail 账单摘要与费用分区
  - rentable-units-list 主状态与风险标签摘要
affects: [mini-program-services, phase2-ui]
tech-stack:
  added: []
  patterns: [thin-service-layer, detail-first-aggregation]
key-files:
  created:
    - cloudfunctions/bills-receive/index.ts
    - miniprogram/services/bill.ts
  modified:
    - cloudfunctions/rentable-unit-detail/index.ts
    - cloudfunctions/rentable-units-list/index.ts
    - cloudfunctions/shared/runtime.ts
    - cloudfunctions/shared/repositories/bill-repository.ts
key-decisions:
  - "详情页直接返回 `summaryCard`、`primaryActions` 和 `feeSections`，前端不再自行拼账单分区。"
  - "列表查询同时返回主状态和风险标签，让经营风险不再被单枚举覆盖。"
patterns-established:
  - "Pattern 1: 收款动作只更新 bill，不回写租约字段。"
  - "Pattern 2: 列表与详情统一消费共享房态摘要。"
requirements-completed: [ASST-04, BILL-02, BILL-03, LIST-02]
metrics:
  duration: 35min
  completed: 2026-04-03
---

# Phase 02 Plan 02: 查询与动作层 Summary

Phase 2 的查询和动作层已经接通，列表、详情和收款登记都能直接消费 bill 事实。

## Accomplishments

- 新增 `bills-receive` 云函数和 `receiveBill()` service，登记收款后 bill 会切换到已收状态。
- `rentable-unit-detail` 现在返回摘要卡、主动作、费用分区和历史默认折叠标记。
- `rentable-units-list` 现在返回 `mainStatus`、`riskTagLabels` 和 `summaryHint` 等房态摘要字段。

## Task Commits

1. **Task 1: 实现收款登记与详情账单分区聚合** - `5834a15` (feat)
2. **Task 2: 升级列表房态摘要为主状态 + 风险标签** - `15762b7` (feat)

## Verification

- `npm test -- --runInBand --runTestsByPath tests/cloud/bills-receive.spec.ts tests/cloud/rentable-unit-detail-billing.spec.ts`
- `npm test -- --runInBand --runTestsByPath tests/cloud/rentable-units-list-status.spec.ts`
- `npm run typecheck`

## Self-Check: PASSED

- SUMMARY file exists.
- Task commits `5834a15` and `15762b7` exist in git history.
