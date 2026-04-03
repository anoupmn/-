---
phase: 02-账单与房态视图
plan: 01
subsystem: domain
tags: [billing-ledger, shared-calculators, lease-sync]
requires:
  - phase: 01-03
    provides: 房源/房间/租约领域模型
provides:
  - bill schema 与费用规则扩展
  - 账单状态与房态共享计算器
  - 租约保存时的 bill 同步能力
affects: [phase2-query, phase2-ui, dashboard]
tech-stack:
  added: []
  patterns: [shared-billing-truth, derived-unit-status]
key-files:
  created:
    - cloudfunctions/shared/schemas/bill.ts
    - cloudfunctions/shared/calculators/bill-status.ts
    - cloudfunctions/shared/repositories/bill-repository.ts
  modified:
    - cloudfunctions/shared/schemas/lease.ts
    - cloudfunctions/shared/repositories/lease-repository.ts
    - cloudfunctions/shared/calculators/rentable-unit.ts
key-decisions:
  - "账单真相落在 `bills` 集合，不把状态继续塞回租约单字段。"
  - "旧的 `rentAmount` / `depositAmount` 编辑路径继续兼容，并同步回 `feeRules`。"
patterns-established:
  - "Pattern 1: bill 状态统一通过共享计算器推导。"
  - "Pattern 2: 租约保存后立即同步 bill，查询层只消费 bill 事实。"
requirements-completed: [BILL-01, BILL-03]
metrics:
  duration: 55min
  completed: 2026-04-03
---

# Phase 02 Plan 01: 账单骨架 Summary

Phase 2 的账单领域底座已经建立完成，后续列表、详情和收款动作都可以建立在 bill 事实而不是临时推导之上。

## Accomplishments

- 扩展 `lease` 费用规则，支持固定费用项和 `customFeeItems`。
- 新增 `bill` schema、账单状态计算器和房态风险标签推导。
- 在租约创建/更新时同步具体 bill 记录，并补齐对应云端测试。

## Task Commits

1. **Task 1: 用测试锁定 bill schema、费用规则和状态计算** - `a5d4f28` (feat)
2. **Task 2: 实现租约保存时的 bill 同步与下一笔应收推导** - `fdbcc7f` (feat)

## Verification

- `npm test -- --runInBand --runTestsByPath tests/domain/bill-status.spec.ts tests/domain/rentable-unit-status.spec.ts`
- `npm test -- --runInBand --runTestsByPath tests/cloud/bills-sync.spec.ts tests/cloud/leases-save-billing.spec.ts`
- `npm run typecheck`

## Self-Check: PASSED

- SUMMARY file exists.
- Task commits `a5d4f28` and `fdbcc7f` exist in git history.
