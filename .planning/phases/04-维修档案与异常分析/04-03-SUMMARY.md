---
phase: 04-维修档案与异常分析
plan: 03
subsystem: unit-detail-archive
tags: [unit-detail, tenant-history, repair-history, stats]
requires:
  - phase: 04-01
    provides: 维修记录写入能力
  - phase: 04-02
    provides: 维修统计与异常判定能力
provides:
  - 详情页历史租约补齐租户名
  - 详情页历史维修与每任租户期间维修次数展示
  - 详情页维修统计摘要（总次数/近30天/主要类别）
affects: [rentable-unit-detail, unit-detail]
key-files:
  modified:
    - cloudfunctions/rentable-unit-detail/index.ts
    - miniprogram/pages/unit-detail/index.ts
    - miniprogram/pages/unit-detail/index.wxml
    - miniprogram/pages/unit-detail/index.wxss
    - tests/cloud/rentable-unit-detail-billing.spec.ts
  created:
    - tests/cloud/rentable-unit-detail-repairs.spec.ts
requirements-completed: [LIST-03]
completed: 2026-04-06
---

# Phase 04 Plan 03 Summary

完成 LIST-03 交付：详情页可直接查看历史租户、历史维修、主要维修类别与每任租户期间维修次数，形成追溯闭环。

## Verification

- `npm test -- --runInBand --runTestsByPath tests/cloud/rentable-unit-detail-billing.spec.ts tests/cloud/rentable-unit-detail-repairs.spec.ts`
- `npm run typecheck`

## Notes

- `rentable-unit-detail` 返回 `repairStats`、`tenantPeriodRepairs`、`repairHistory`。
- 历史租约改为展示 `tenantName`，不再显示裸 `tenantId`。
- 历史区保持默认折叠，展开后可读性优先。

## Self-Check

PASSED
