---
phase: 05-费用与账单模型优化
plan: 05-04
subsystem: billing
tags: [owner-expense, repair-records, cloudfunctions, wechat-miniprogram]

requires:
  - phase: 05-03
    provides: bills 与水电抄表边界，房东支出不得写入租客账单
provides:
  - owner_expenses 房东支出事实集合
  - owner-expense-save 云函数
  - 维修类支出联动 repair_records，非维修类只留痕
  - 单元详情记录维修/支出入口与支出列表
affects: [05-05, phase-06, export, correction]

tech-stack:
  added: []
  patterns: [租客账单与房东支出分离, 金额可空留痕, 维修类支出联动维修事实]

key-files:
  created:
    - cloudfunctions/shared/schemas/owner-expense.ts
    - cloudfunctions/shared/repositories/owner-expense-repository.ts
    - cloudfunctions/owner-expense-save/index.ts
    - cloudfunctions/owner-expense-save/package.json
    - miniprogram/services/owner-expense.ts
    - tests/cloud/owner-expense-save.spec.ts
    - .planning/phases/05-费用与账单模型优化/05-04-SUMMARY.md
  modified:
    - cloudfunctions/shared/constants/collections.ts
    - cloudfunctions/rentable-unit-detail/index.ts
    - miniprogram/pages/unit-detail/index.ts
    - miniprogram/pages/unit-detail/index.wxml
    - miniprogram/pages/unit-detail/index.wxss
    - tests/helpers/mock-cloud.ts
    - tests/cloud/repair-record-save.spec.ts

key-decisions:
  - "房东支出全部写入 owner_expenses，不写入 bills"
  - "维修类支出创建 repair_records 并关联 repairRecordId，参与维修异常统计"
  - "保洁、打理、请人管理和其他支出不创建 repair_records"

patterns-established:
  - "createOwnerExpense 负责校验房源/房间归属、归月 monthKey 和维修联动"
  - "详情页合并入口记录维修/支出，后端仍保持 owner_expenses 与 repair_records 事实拆分"
  - "新云函数继续携带函数目录内 shared 副本，保持独立部署模式"

requirements-completed: [OPEX-01, OPEX-02]

duration: 32min
completed: 2026-04-28
---

# Phase 05-04: 维修/打理支出独立建模与房间问题分析口径 Summary

**房东经营支出从租客账单中剥离，维修类支出保留问题分析能力，非维修支出只进入支出事实。**

## Performance

- **Duration:** 32min
- **Started:** 2026-04-28T00:41:00+08:00
- **Completed:** 2026-04-28T01:12:51+08:00
- **Tasks:** 3
- **Files modified:** 174

## Accomplishments

- 新增 `owner_expenses` 集合合同，支持 `repair/cleaning/caretaking/labor/other`，金额可为 `null`。
- 新增 `owner-expense-save` 云函数，按房间/房源校验当前房东归属并写入 `monthKey`。
- 维修类支出会创建并关联维修记录；保洁、打理、请人管理和其他支出不会影响维修高频异常。
- 单元详情页新增“记录维修/支出”入口，并展示最近房东支出与累计金额。

## Task Commits

1. **Task 1-3: 房东支出合同、云函数和详情页入口** - `47e6d8d` (feat)

## Files Created/Modified

- `cloudfunctions/shared/schemas/owner-expense.ts` - 房东支出合同和输入 schema。
- `cloudfunctions/shared/repositories/owner-expense-repository.ts` - 支出保存、按房间查询、金额摘要和维修联动。
- `cloudfunctions/owner-expense-save/index.ts` - 记录房东支出云函数。
- `cloudfunctions/rentable-unit-detail/index.ts` - 返回房东支出摘要和最近支出列表。
- `miniprogram/services/owner-expense.ts` - 小程序调用 `owner-expense-save`。
- `miniprogram/pages/unit-detail/index.ts` - 详情页记录维修/支出，不再把房东支出写入 bills。
- `tests/cloud/owner-expense-save.spec.ts` - 覆盖金额可空、维修联动、非维修不建维修记录和按发生日期归月。
- `tests/cloud/repair-record-save.spec.ts` - 覆盖非维修支出不影响维修异常统计。

## Decisions Made

- `amount` 使用 `number | null`，空金额也能留痕，后续统计只汇总非空金额。
- `monthKey` 固定由 `occurredAt.slice(0, 7)` 写入，为 Phase 06 月度导出准备。
- 详情页使用一个合并入口降低录入成本，后端保持清晰事实边界。

## Deviations from Plan

None - plan executed as written.

## Issues Encountered

- 新增云函数需要完整 `shared` 副本，导致提交文件数较多；已通过编译刷新 `.js` 镜像并同步到各云函数副本。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

05-05 可以基于 `bills`、`repair_records`、`owner_expenses` 的边界实现退租、录错、安全删除和全链路验证。

---
*Phase: 05-费用与账单模型优化*
*Completed: 2026-04-28*
