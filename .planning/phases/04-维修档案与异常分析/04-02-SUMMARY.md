---
phase: 04-维修档案与异常分析
plan: 02
subsystem: repair-anomaly
tags: [alerts, dashboard, abnormal-flags, analytics]
requires:
  - phase: 04-01
    provides: 维修记录基础事实
provides:
  - 每房维修统计（总次数、近30天、主要类别、租约期间计数）
  - 维修频次异常自动识别并写入 abnormal_flags
  - 首页/提醒中心接入维修异常（沿用 Phase 3 口径）
affects: [dashboard-home, alerts-list, abnormal_flags, alert-evaluator]
key-files:
  modified:
    - cloudfunctions/shared/repositories/repair-record-repository.ts
    - cloudfunctions/shared/schemas/abnormal-flag.ts
    - cloudfunctions/shared/repositories/abnormal-flag-repository.ts
    - cloudfunctions/shared/calculators/alert-evaluator.ts
    - cloudfunctions/dashboard-home/index.ts
    - cloudfunctions/alerts-list/index.ts
    - tests/domain/alert-evaluator.spec.ts
    - tests/cloud/dashboard-home.spec.ts
    - tests/cloud/alerts-list.spec.ts
    - tests/cloud/manual-abnormal.spec.ts
requirements-completed: [REPR-03, REPR-04, REPR-05, REPR-06]
completed: 2026-04-06
---

# Phase 04 Plan 02 Summary

完成维修统计与异常识别后端闭环：系统可以识别“近 30 天维修次数过高”，并通过既有异常链路进入首页与提醒中心。

## Verification

- `npm test -- --runInBand --runTestsByPath tests/domain/alert-evaluator.spec.ts tests/cloud/dashboard-home.spec.ts tests/cloud/alerts-list.spec.ts tests/cloud/manual-abnormal.spec.ts`
- `npm run typecheck`

## Notes

- `abnormal_flags` 新增 `source`（`manual` / `repair_frequency`），避免人工异常与维修异常互相覆盖。
- 高频异常阈值固定为近 30 天 >= 3 次。
- 提醒类型与异常 bucket 沿用 Phase 3，不新增平行状态语言。

## Self-Check

PASSED
