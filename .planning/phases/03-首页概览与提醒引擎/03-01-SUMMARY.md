---
phase: 03-首页概览与提醒引擎
plan: 01
subsystem: api
tags: [cloudfunctions, dashboard, alerts, reminders, zod, jest]
requires:
  - phase: 02-账单与房态视图
    provides: rentable-unit status summaries, bill truth, 15-day due window
provides:
  - unified alert evaluation for expiring, overdue, vacancy_long, and manual_abnormal
  - dashboard home aggregate payload with overview cards, abnormal rows, recommendation, and subscription state
  - grouped alerts listing and persisted manual abnormal flags
affects: [03-02-PLAN.md, 03-03-PLAN.md, miniprogram workbench, reminder settings]
tech-stack:
  added: []
  patterns: [shared alert evaluator, derived dashboard aggregate payload, manual abnormal as persisted fact]
key-files:
  created:
    - cloudfunctions/shared/calculators/alert-evaluator.ts
    - cloudfunctions/dashboard-home/index.ts
    - cloudfunctions/alerts-list/index.ts
    - cloudfunctions/shared/repositories/alert-repository.ts
    - cloudfunctions/shared/schemas/alert.ts
  modified:
    - cloudfunctions/shared/calculators/dashboard.ts
    - cloudfunctions/shared/constants/collections.ts
    - cloudfunctions/shared/constants/statuses.ts
    - tests/helpers/mock-cloud.ts
key-decisions:
  - "首页概览、提醒分组和主建议全部复用同一次共享提醒评估，避免口径漂移。"
  - "人工异常作为 abnormal_flags 独立事实持久化，不回写 room 真相字段。"
  - "首页异常数按受影响房间去重统计，提醒中心仍按规则类型分组展示。"
patterns-established:
  - "Pattern 1: 云函数先补齐 active lease bills，再统一跑 alert evaluator。"
  - "Pattern 2: 首页 payload 由共享 dashboard calculator 输出，页面层只消费聚合结果。"
requirements-completed: [DASH-01, DASH-02, DASH-03, ALRT-01, ALRT-02, ALRT-03, ALRT-04, ALRT-05]
duration: 10 min
completed: 2026-04-03
---

# Phase 03 Plan 01: 首页概览与提醒引擎 Summary

**共享提醒评估器驱动的首页聚合、规则分组提醒列表和人工异常持久化入口**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-03T08:46:00Z
- **Completed:** 2026-04-03T08:56:07Z
- **Tasks:** 2
- **Files modified:** 18

## Accomplishments
- 新增提醒、人工异常、订阅偏好 schema 与共享 alert evaluator，统一产出 `expiring`、`overdue`、`vacancy_long`、`manual_abnormal`。
- 实现 `dashboard-home` 与 `alerts-list` 云函数，首页概览卡、异常列表、主建议和提醒分组都复用同一套评估结果。
- 落地 `alert-manual-flag-save` 与 abnormal flag repository，人工异常可保存、清除，并进入首页与提醒查询。

## Task Commits

Each task was committed atomically:

1. **Task 1: 用测试锁定提醒分类、人工异常和主建议优先级** - `128d32d` (`test`), `d2a31ae` (`feat`)
2. **Task 2: 实现首页聚合和按规则分组的提醒查询** - `c05c004` (`test`), `229c38b` (`feat`)

_Note: TDD tasks used test -> feat commits._

## Files Created/Modified
- `cloudfunctions/shared/calculators/alert-evaluator.ts` - 统一提醒分类、优先级和推荐入口。
- `cloudfunctions/shared/calculators/dashboard.ts` - 首页 recommendation 与 dashboard payload 组装。
- `cloudfunctions/shared/repositories/alert-repository.ts` - 基于共享 evaluator 重建提醒快照集合。
- `cloudfunctions/shared/repositories/abnormal-flag-repository.ts` - 保存与读取人工异常事实。
- `cloudfunctions/shared/repositories/notification-preference-repository.ts` - 读取首页所需订阅状态。
- `cloudfunctions/dashboard-home/index.ts` - 返回 `overviewCards`、`abnormalRows`、`recommendation`、`subscriptionState`。
- `cloudfunctions/alerts-list/index.ts` - 按提醒规则类型分组返回 `groups`。
- `cloudfunctions/alert-manual-flag-save/index.ts` - 保存或 clear 人工异常。
- `tests/domain/alert-evaluator.spec.ts` - 锁定优先级和分类行为。
- `tests/cloud/dashboard-home.spec.ts` - 锁定首页聚合 payload。
- `tests/cloud/alerts-list.spec.ts` - 锁定提醒分组输出。
- `tests/cloud/manual-abnormal.spec.ts` - 锁定人工异常保存与清除行为。

## Decisions Made
- 首页、提醒中心和主建议都由共享评估器驱动，不在各云函数里重复判断规则。
- 人工异常和派生异常分开建模，保证用户事实可追踪且不污染房间基础数据。
- 首页异常概览聚合为“异常房间数”，避免同一房间多个异常导致首页数字失真。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `zod@4` 的 `z.record` 需要显式 key/value schema，修正后测试与类型检查通过。
- 首页异常数最初按提醒条目累计，调整为按房间去重后与驾驶舱语义一致。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 3 后续页面可以直接消费首页聚合 payload 与提醒分组结果，无需前端自行拼接规则。
- 订阅设置页只需在现有 `notification_preferences` 模型上补保存入口与 UI 即可。

## Self-Check

PASSED

---
*Phase: 03-首页概览与提醒引擎*
*Completed: 2026-04-03*
