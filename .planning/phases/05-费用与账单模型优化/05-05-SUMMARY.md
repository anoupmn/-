---
phase: 05-费用与账单模型优化
plan: 05-05
subsystem: billing
tags: [lease-delete, correction, safety, cloudfunctions, regression]

requires:
  - phase: 05-02
    provides: 账单分类与押金类事实字段
  - phase: 05-03
    provides: 水电抄表账单事实
  - phase: 05-04
    provides: owner_expenses 房东支出事实
provides:
  - leases-delete 安全删除云函数
  - 删除 blocker 检查：已收账单、收据、维修记录、房东支出
  - 详情页安全删除入口和退租未收账单处理提示
  - Phase 05 全量测试回归通过
affects: [phase-06, export, receipt, correction]

tech-stack:
  added: []
  patterns: [先检查再确认删除, blocker codes, 退租保留历史]

key-files:
  created:
    - cloudfunctions/leases-delete/index.ts
    - cloudfunctions/leases-delete/package.json
    - tests/cloud/leases-delete.spec.ts
    - tests/cloud/unit-detail-flow.spec.ts
    - .planning/phases/05-费用与账单模型优化/05-05-SUMMARY.md
  modified:
    - cloudfunctions/shared/constants/collections.ts
    - cloudfunctions/shared/repositories/lease-repository.ts
    - cloudfunctions/shared/calculators/lease-lifecycle.ts
    - miniprogram/services/lease.ts
    - miniprogram/pages/unit-detail/index.ts
    - miniprogram/pages/unit-detail/index.wxml
    - miniprogram/pages/unit-detail/index.wxss
    - tests/cloud/leases-end.spec.ts
    - tests/helpers/mock-cloud.ts

key-decisions:
  - "硬删除只允许无已收账单、无收据、无维修记录、无房东支出关联的录错租约"
  - "删除前必须先 check，再 confirm: true 才会真正删除"
  - "结束租约继续保留历史，只返回未收账单处理选项，不自动替用户迁移或作废"

patterns-established:
  - "getLeaseDeleteBlockers 统一输出 paid_bill/receipt/repair_record/owner_expense blocker"
  - "deleteLeaseSafely 只级联删除未收且无收据引用的账单"
  - "详情页删除流程使用服务层 deleteLease，不直接操作集合"

requirements-completed: [CORR-02]

duration: 30min
completed: 2026-04-28
---

# Phase 05-05: 退租、录错、删除/修改补救策略与全链路验证 Summary

**录错租约可以安全删除，有历史关联的租约被 blocker 保护，退租继续保留历史并提示未收账单处理方式。**

## Performance

- **Duration:** 30min
- **Started:** 2026-04-28T00:53:00+08:00
- **Completed:** 2026-04-28T01:23:20+08:00
- **Tasks:** 3
- **Files modified:** 179

## Accomplishments

- 新增 `leases-delete` 云函数，支持 `mode: 'check' | 'delete'` 和 `confirm: true`。
- 删除 blocker 覆盖已收账单、收据引用、维修记录和房东支出。
- 无 blocker 时删除租约，并级联删除该租约下未收且无收据引用的账单。
- 详情页新增“安全删除租约”入口，结束租约提示“保留欠款 / 作废未收系统账单 / 修改截止日期后重算”。
- Phase 05 全量回归通过：28 个测试套件、77 个测试。

## Task Commits

1. **Task 1-3: 租约安全删除、退租提示和全链路回归** - `b8c464d` (feat)

## Files Created/Modified

- `cloudfunctions/leases-delete/index.ts` - 租约删除 check/delete 云函数。
- `cloudfunctions/shared/repositories/lease-repository.ts` - blocker 检查、安全删除和退租未收账单摘要。
- `cloudfunctions/shared/constants/collections.ts` - 增加 `receipts` 集合常量。
- `miniprogram/services/lease.ts` - 增加 `deleteLease` 服务调用。
- `miniprogram/pages/unit-detail/index.ts` - 接入安全删除、blocker 文案和退租未收账单提示。
- `tests/cloud/leases-delete.spec.ts` - 覆盖可删除、blocker 和 confirm 保护。
- `tests/cloud/unit-detail-flow.spec.ts` - 覆盖前端服务调用与补救提示文案。

## Decisions Made

- 收据集合在 Phase 05 先只作为 blocker 检查目标，收据生成仍留给 Phase 06。
- 对旧测试 mock 补齐业务 `id` 更新行为，保持与 05-01 的业务 id 写入边界一致。
- 租约冲突检查改为日期区间重叠判断，允许已提前结束租约之后的新租约。

## Deviations from Plan

### Auto-fixed Issues

**1. 修复全量回归中的租约区间与 mock 更新问题**
- **Found during:** Task 3 全量测试
- **Issue:** 旧冲突校验只看当前 active 状态，不能阻止未来重叠租约；`leases-end` 专用 mock 仍只模拟 `_id` 更新。
- **Fix:** `assertSingleActiveLease` 改为租约日期区间重叠校验，并补齐测试 mock 的 `where().update()` 行为。
- **Files modified:** `cloudfunctions/shared/calculators/lease-lifecycle.ts`, `tests/cloud/leases-end.spec.ts`
- **Verification:** `npm test -- --runInBand && npm run typecheck`
- **Committed in:** `b8c464d`

---

**Total deviations:** 1 auto-fixed
**Impact on plan:** 属于安全删除全链路回归发现的必要修复，未扩大 Phase 06 范围。

## Issues Encountered

- 全量测试首次暴露两个旧测试/逻辑不一致点，已修复并重新跑通全部测试。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 06 可以直接消费稳定的账单行、水电读数、房东支出和删除/收据 blocker 口径来做月度导出与收据。

---
*Phase: 05-费用与账单模型优化*
*Completed: 2026-04-28*
