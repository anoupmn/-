---
phase: 07-收据管理与凭证体验补全
plan: 07-01
subsystem: backend
tags: [receipt-list, receipt-snapshot, cloudfunctions, jest]
requires:
  - phase: 06-月度导出与收据
    provides: 基础收据创建、读取和删除管理能力
provides:
  - 收据记录列表云函数 `receipt-list`
  - 快照型收据列表行与筛选能力
  - 删除收据、月度开具和有效收据重复保护后端约束
affects: [receipt, unit-detail, receipt-records, phase-07]
tech-stack:
  added: []
  patterns:
    - 收据管理页从 `receipts` 快照读取列表行，不动态重算账单
    - 云函数目录携带 shared 副本以便独立部署
key-files:
  created:
    - cloudfunctions/receipt-list/index.ts
    - cloudfunctions/receipt-list/package.json
    - tests/cloud/receipt-list.spec.ts
  modified:
    - cloudfunctions/shared/repositories/receipt-repository.ts
    - cloudfunctions/receipt-create/shared/repositories/receipt-repository.ts
    - cloudfunctions/receipt-delete/shared/repositories/receipt-repository.ts
    - miniprogram/services/receipt.ts
    - tests/cloud/receipt-create.spec.ts
    - tests/cloud/receipt-delete.spec.ts
key-decisions:
  - "收据记录列表的月份筛选按账单应收月份 `item.dueDate.slice(0, 7)`，收款日期只展示。"
  - "重复开具保护以 active receipts 的 `billIds` 为权威，同时兼容账单反向引用。"
  - "误开收据通过删除处理；删除会解除账单 `receiptId` 引用，允许重新按租约月份开具。"
patterns-established:
  - "Receipt list row: 从收据快照映射 `receiptNo/monthKey/assetName/roomName/tenantName/receivedAt/totalAmount/status/billCount`。"
  - "Merged receipt guard: 所有账单必须同房间、同租客、同租约、同账单月份。"
requirements-completed: [RCPT-03, RCPT-04, RCPT-05, RCPT-06]
duration: 33 min
completed: 2026-04-28
---

# Phase 07 Plan 01: 收据管理后端列表、快照行和不变量加固 Summary

**收据后端现在能按房东隔离列出快照记录，并支持删除收据、解除账单引用、拒绝跨租客合并和重复有效收据。**

## Performance

- **Duration:** 33 min
- **Started:** 2026-04-28T04:09:00Z
- **Completed:** 2026-04-28T04:42:50Z
- **Tasks:** 2
- **Files modified:** 82

## Accomplishments

- 新增 `receipt-list` 云函数和 `listReceiptRecords` 服务封装。
- 新增 `tests/cloud/receipt-list.spec.ts`，覆盖当前房东隔离、月份/房源/房间/租客筛选和快照名称稳定性。
- 加固 `receipt-create`，合并收据必须同房间、同租客、同租约、同月份，并通过 active receipts 的 `billIds` 防重复。
- 加固 `receipt-delete`，删除收据时解除关联账单引用，避免误开记录堆积后无法管理。

## Task Commits

1. **Task 1 + Task 2: 收据列表与不变量加固** - `102b3bc` (feat)

**Plan metadata:** pending follow-up docs commit

## Files Created/Modified

- `cloudfunctions/receipt-list/index.ts` - 新增收据列表云函数。
- `cloudfunctions/receipt-list/shared/` - 新云函数部署所需 shared 副本。
- `cloudfunctions/shared/repositories/receipt-repository.ts` - 新增列表筛选与快照行映射，并加固创建/删除规则。
- `cloudfunctions/receipt-create/shared/repositories/receipt-repository.ts` - 同步收据创建云函数 shared 副本。
- `cloudfunctions/receipt-delete/shared/repositories/receipt-repository.ts` - 同步收据删除云函数 shared 副本。
- `miniprogram/services/receipt.ts` - 增加 `listReceiptRecords` 服务调用。
- `tests/cloud/receipt-list.spec.ts` - 新增收据列表测试。
- `tests/cloud/receipt-create.spec.ts` - 增加合并开具与重复保护测试。
- `tests/cloud/receipt-delete.spec.ts` - 增加删除收据与解除账单引用测试。

## Decisions Made

- 月份筛选采用账单应收月份，避免晚收款账单在收据管理页消失。
- 列表返回内部跳转所需 `id`/`billIds`，但 UI 计划继续要求 WXML 不展示内部 ID。
- `month + roomId` 的合并创建仍由后端最终裁决；如果同房同月出现不同租客，后端拒绝，前端后续按候选分组处理。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] 同步云函数 shared 副本**
- **Found during:** Task 1/2
- **Issue:** `receipt-create` 和收据管理云函数实际导入各自目录下的 `shared/repositories/receipt-repository`，只改根 `cloudfunctions/shared` 会让测试和部署读到旧逻辑。
- **Fix:** 同步 `receipt-create`、`receipt-get`、`receipt-delete` 的收据 repository 副本，并为新 `receipt-list` 携带完整 shared 副本。
- **Files modified:** `cloudfunctions/receipt-create/shared/repositories/receipt-repository.*`, `cloudfunctions/receipt-get/shared/repositories/receipt-repository.*`, `cloudfunctions/receipt-delete/shared/repositories/receipt-repository.*`, `cloudfunctions/receipt-list/shared/**`
- **Verification:** `npm test -- --runTestsByPath tests/cloud/receipt-list.spec.ts tests/cloud/receipt-create.spec.ts tests/cloud/receipt-delete.spec.ts --runInBand` 通过；`npm run typecheck` 通过。
- **Committed in:** `102b3bc`

**Total deviations:** 1 auto-fixed (Rule 3).  
**Impact on plan:** 必要同步，避免云函数目录与根 shared 逻辑漂移；未引入额外业务范围。

## Issues Encountered

- RED 阶段如预期失败：`receipt-list` 不存在，旧逻辑缺少删除管理、跨租客合并保护和有效收据重复保护。
- 生成 `.js` 输出时曾触碰不相关 shared 文件，已收回，只保留收据相关文件。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

07-02 可以直接消费 `receipt-list` 和 `listReceiptRecords`，实现业务维护入口、收据记录页和筛选 UI。

---
*Phase: 07-收据管理与凭证体验补全*
*Completed: 2026-04-28*
