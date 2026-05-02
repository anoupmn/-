---
phase: 07-收据管理与凭证体验补全
plan: 07-02
subsystem: ui
tags: [receipt-records, mini-program, filters, ops-tab]
requires:
  - phase: 07-01
    provides: `receipt-list` 云函数和快照型收据列表行
provides:
  - 业务维护内的收据记录入口
  - `pages/receipt-records` 收据记录管理页
  - 月份、房源、房间、租客筛选
  - 查看收据与回到房间的记录卡片动作
affects: [ops, receipt-records, receipt, unit-detail]
tech-stack:
  added: []
  patterns:
    - 小程序页面通过 service 调用云函数，不直接读集合
    - 内部 ID 只用于 dataset 跳转，不作为可见标签展示
key-files:
  created:
    - miniprogram/pages/receipt-records/index.ts
    - miniprogram/pages/receipt-records/index.wxml
    - miniprogram/pages/receipt-records/index.wxss
    - miniprogram/pages/receipt-records/index.json
  modified:
    - miniprogram/app.json
    - miniprogram/pages/ops/index.wxml
    - tests/cloud/unit-detail-flow.spec.ts
key-decisions:
  - "租客筛选第一版从收据列表行中提取已有租客选项，不新增 `tenants-list` 云函数。"
  - "收据记录页内部保留 receipt/room ids 用于跳转，但 WXML 不展示 ID 标签。"
patterns-established:
  - "Receipt records filters: month/asset/room/tenant 全部通过 `receipt-list` filters 传递。"
  - "Receipt card actions: `查看收据` 进入收据页，`回到房间` 返回房间详情。"
requirements-completed: [RCPT-03, RCPT-04, RCPT-08]
duration: 24 min
completed: 2026-04-28
---

# Phase 07 Plan 02: 收据记录管理页、筛选和业务维护入口 Summary

**业务维护现在有收据记录入口，用户可以按业务标签筛选收据并从记录卡片进入收据或房间详情。**

## Performance

- **Duration:** 24 min
- **Started:** 2026-04-28T04:43:00Z
- **Completed:** 2026-04-28T05:07:00Z
- **Tasks:** 2
- **Files modified:** 18

## Accomplishments

- `app.json` 注册 `pages/receipt-records/index`。
- 业务维护的“月度经营导出”区域升级为“经营凭证”，新增 `收据记录` 入口。
- 新增收据记录页，支持全部月份、房源、房间和租客筛选。
- 列表卡片展示收据编号、房源/房间、租客、收款日期、金额和账单数。
- 卡片提供 `查看收据` 和 `回到房间` 动作，界面不展示内部 ID。

## Task Commits

1. **Task 1 + Task 2: 收据记录页与筛选闭环** - `f3345bd` (feat)

**Plan metadata:** pending follow-up docs commit

## Files Created/Modified

- `miniprogram/pages/receipt-records/index.ts` - 收据记录页加载、筛选和跳转逻辑。
- `miniprogram/pages/receipt-records/index.wxml` - 筛选控件、空状态和收据卡片。
- `miniprogram/pages/receipt-records/index.wxss` - 收据记录页布局。
- `miniprogram/app.json` - 注册页面。
- `miniprogram/pages/ops/index.wxml` - 新增经营凭证/收据记录入口。
- `tests/cloud/unit-detail-flow.spec.ts` - 静态断言页面注册、入口和记录页文案。

## Decisions Made

- 不新增租客列表云函数，避免扩大后端范围；租客筛选选项由当前收据记录中的快照租客聚合。
- 页面保留 `data-id` 用于跳转，但可见文案全部使用收据编号、房源、房间、租客等业务标签。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] 列表行增加内部业务 ID 供页面跳转**
- **Found during:** Task 2
- **Issue:** 07-01 列表行最初只返回展示字段，记录页无法可靠跳转回房间详情或构造筛选选项。
- **Fix:** 在 `ReceiptRecord` 内增加 `assetId`、`roomId`、`tenantId`，仅供页面逻辑使用，WXML 不展示这些 ID 标签。
- **Files modified:** `cloudfunctions/shared/repositories/receipt-repository.ts`, receipt cloud function shared copies
- **Verification:** `npm test -- --runTestsByPath tests/cloud/unit-detail-flow.spec.ts tests/cloud/receipt-list.spec.ts --runInBand` 通过；`npm run typecheck` 通过。
- **Committed in:** `f3345bd`

**Total deviations:** 1 auto-fixed (Rule 2).  
**Impact on plan:** 保持页面闭环所需，未改变用户可见信息。

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

07-03 可以在房间详情和收据页继续补租约月度开具、已开收据查看和删除管理闭环。

---
*Phase: 07-收据管理与凭证体验补全*
*Completed: 2026-04-28*
