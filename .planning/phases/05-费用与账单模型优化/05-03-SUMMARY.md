---
phase: 05-费用与账单模型优化
plan: 05-03
subsystem: billing
tags: [wechat-miniprogram, cloudfunctions, utility-meter, billing]

requires:
  - phase: 05-02
    provides: 账单行费用类型、性质、周期和一次性字段
provides:
  - 水电抄表账单服务端计算
  - 同房间同类型上一笔水电读数默认值
  - 月度账单水电读数、用量、单价、金额和备注展示
affects: [05-04, 05-05, phase-06, export, receipt]

tech-stack:
  added: []
  patterns: [服务端金额真相, meterReading 账单事实字段, 详情接口默认值回填]

key-files:
  created:
    - .planning/phases/05-费用与账单模型优化/05-03-SUMMARY.md
  modified:
    - cloudfunctions/shared/schemas/bill.ts
    - cloudfunctions/shared/repositories/bill-repository.ts
    - cloudfunctions/bills-save/index.ts
    - cloudfunctions/rentable-unit-detail/index.ts
    - miniprogram/services/bill.ts
    - miniprogram/pages/unit-detail/index.ts
    - miniprogram/pages/unit-detail/index.wxml
    - miniprogram/pages/unit-detail/index.wxss
    - tests/cloud/bills-save.spec.ts
    - tests/cloud/rentable-unit-detail-billing.spec.ts

key-decisions:
  - "水费和电费写入 bills 时必须通过 previousReading/currentReading/unitPrice 计算 amount"
  - "前端不再把水电最终金额作为真相提交"
  - "维修、保洁、打理、请人管理等房东支出标签不得写入租客 bills"

patterns-established:
  - "calculateMeterBill 统一校验读数并按 Math.round(usage * unitPrice * 100) / 100 取两位金额"
  - "rentable-unit-detail 返回 meterDefaults.water/electricity 供补录弹窗预填"
  - "月度账单 item 直接携带 meterReading 和 note，前端只负责展示"

requirements-completed: [UTIL-01, UTIL-02]

duration: 35min
completed: 2026-04-28
---

# Phase 05-03: 水电抄表计费、默认读数和月度账单展示 Summary

**水电补录改为读数和单价输入，金额由云函数计算并在月度账单中展示完整抄表事实。**

## Performance

- **Duration:** 35min
- **Started:** 2026-04-28T00:28:00+08:00
- **Completed:** 2026-04-28T01:03:22+08:00
- **Tasks:** 3
- **Files modified:** 80

## Accomplishments

- `bills-save` 对水费/电费忽略客户端 `amount`，只根据上期读数、本期读数和单价计算金额。
- `billSchema` 增加 `meterReading`，包含 `previousReading`、`currentReading`、`usage`、`unitPrice`。
- `rentable-unit-detail` 返回 `meterDefaults.water/electricity`，取同房间同类型最近一笔账单的本期读数和单价。
- 单元详情补录弹窗支持水电读数输入，月度账单展示读数、用量、单价、金额和备注。

## Task Commits

1. **Task 1-3: 水电抄表后端、详情默认值和前端补录展示** - `d148a2d` (feat)

## Files Created/Modified

- `cloudfunctions/shared/schemas/bill.ts` - 增加水电抄表事实字段。
- `cloudfunctions/shared/repositories/bill-repository.ts` - 新增水电金额计算、抄表账单创建和默认读数解析。
- `cloudfunctions/bills-save/index.ts` - 水电写入改为读数 payload，非水电仍支持一次性租客应收。
- `cloudfunctions/rentable-unit-detail/index.ts` - 返回水电默认读数，并让月度账单 item 携带 `meterReading` 和备注。
- `miniprogram/services/bill.ts` - `saveBill` 支持水电读数 payload，`amount` 不再是必填。
- `miniprogram/pages/unit-detail/index.ts` - 补录水电时读取默认值并校验本期读数不能小于上期读数。
- `miniprogram/pages/unit-detail/index.wxml` - 展示水电读数、用量、单价、金额和备注。
- `tests/cloud/bills-save.spec.ts` - 覆盖服务端计算、读数校验、备注保留和不信任客户端金额。
- `tests/cloud/rentable-unit-detail-billing.spec.ts` - 覆盖默认读数返回和月度账单水电展示数据。

## Decisions Made

- 对水电账单保留 `source: 'manual'`，因为它来自单元详情人工补录，但金额真相在服务端生成。
- 默认读数按 `dueDate` 和 `updatedAt` 取同房间最近一笔含 `meterReading` 的水/电账单。
- 暂时保留旧租约 feeRules 中水电读取兼容，新 UI 不再通过租约固定费用创建水电真相。

## Deviations from Plan

### Auto-fixed Issues

**1. 收掉维修费写入租客账单入口**
- **Found during:** Task 3 单元详情补录改造
- **Issue:** 原补录弹窗有“维修费”选项，会把维修支出写入租客 bills，与 Phase 05 边界冲突。
- **Fix:** 补录费用类型只保留水费、电费、其他费用；服务端拒绝维修、保洁、打理、请人管理等房东支出标签。
- **Files modified:** `miniprogram/pages/unit-detail/index.ts`, `cloudfunctions/shared/repositories/bill-repository.ts`, `tests/cloud/bills-save.spec.ts`
- **Verification:** `npm test -- --runTestsByPath tests/cloud/bills-save.spec.ts tests/cloud/rentable-unit-detail-billing.spec.ts --runInBand`
- **Committed in:** `d148a2d`

---

**Total deviations:** 1 auto-fixed
**Impact on plan:** 与本阶段“本计划不把维修、保洁或打理写入 bills”的成功标准一致。

## Issues Encountered

- 云函数仍采用各目录内 `shared` 副本，根 shared 的 schema/repository 变更已同步到所有云函数副本并刷新 `.js` 镜像。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

05-04 可以基于“维修/保洁/打理不进入 bills”的边界新增房东支出模型；Phase 06 后续导出可直接读取 `meterReading` 和服务端计算金额。

---
*Phase: 05-费用与账单模型优化*
*Completed: 2026-04-28*
