---
phase: 07-收据管理与凭证体验补全
plan: 07-03
subsystem: receipt-ui
tags: [receipt-lease-month, receipt-delete, mini-program]
requires:
  - phase: 07-01
    provides: `receipt-create` 月份+租约创建和重复有效收据校验
provides:
  - 房间详情租约月度开具收据入口
  - 已开收据可直接查看的月度账单状态
  - 收据详情删除入口和删除确认
  - 删除后解除账单引用、允许重新开具的交互闭环
affects: [unit-detail, receipt, rentable-unit-detail, receipt-create, receipt-delete]
tech-stack:
  added: []
  patterns:
    - 前端只展示业务字段，内部 billId/receiptId 仅用于 dataset 和跳转
    - 房间详情不在每个费用细项放收据按钮，只在租约月份层级提供开具/查看入口
key-files:
  modified:
    - cloudfunctions/rentable-unit-detail/index.ts
    - miniprogram/pages/unit-detail/index.ts
    - miniprogram/pages/unit-detail/index.wxml
    - miniprogram/pages/unit-detail/index.wxss
    - miniprogram/pages/receipt/index.ts
    - miniprogram/pages/receipt/index.wxml
    - miniprogram/pages/receipt/index.wxss
    - tests/cloud/unit-detail-flow.spec.ts
key-decisions:
  - "收据开具以 `leaseId + month` 为用户心智：同一租约同一月份只能有一张收款收据。"
  - "候选账单展示费用名称、应收日期、实收日期和实收金额，不展示内部 billId。"
  - "误开或不需要的收据只提供删除；删除会解除关联账单引用，不保留作废/重开状态。"
requirements-completed: [RCPT-05, RCPT-06, RCPT-08]
duration: 22 min
completed: 2026-04-28
---

# Phase 07 Plan 03: 租约月度开具和删除管理体验 Summary

**房间详情现在按租约月份开具一张收据，已开收据可查看，误开通过删除释放账单后重新开具。**

## Performance

- **Duration:** 22 min
- **Started:** 2026-04-28T05:08:00Z
- **Completed:** 2026-04-28T05:30:00Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- 房间详情月度账单区改为租约月份级别的收据入口，避免每个费用细项各自出现收据按钮。
- 当本租约本月存在已收、未开收据的租客账单时，显示 `开具本租约本月收据`。
- 开具成功后提示 `收据已生成` 并跳转到收据预览页。
- 已有收据的月份显示 `查看本月收据`，直接进入该收据详情。
- 收据预览页提供 `删除收据`，删除前二次确认。
- 删除成功后返回收据记录或房间详情，相关账单解除收据引用，可重新按租约月份开具。

## Task Commits

1. **Task 1 + Task 2: 租约月度开具与删除管理体验** - `7e71639` (feat, 后续被最终口径修正)

**Plan metadata:** pending follow-up docs commit

## Files Created/Modified

- `cloudfunctions/rentable-unit-detail/index.ts` / `.js` - 房间详情账单项返回收据状态和租约月份上下文。
- `miniprogram/pages/unit-detail/index.ts` / `.js` - 计算租约月份收据状态，调用 `createReceipt({ leaseId, month })`。
- `miniprogram/pages/unit-detail/index.wxml` - 月份级收据入口、`开具本租约本月收据` 和 `查看本月收据` 文案。
- `miniprogram/pages/unit-detail/index.wxss` - 月份级收据操作区样式。
- `miniprogram/pages/receipt/index.ts` / `.js` - 删除确认、调用 `deleteReceipt` 和删除后返回逻辑。
- `miniprogram/pages/receipt/index.wxml` - 删除收据动作，不展示内部 ID。
- `miniprogram/pages/receipt/index.wxss` - 删除动作样式。
- `tests/cloud/unit-detail-flow.spec.ts` - 静态断言月度开具、删除管理和内部 ID 不可见。

## Decisions Made

- 收据是租约月度账单的整体凭证，不是费用细项的逐条凭证。
- 房间详情只暴露月份级开具/查看入口，费用细项只显示账单状态和金额。
- 删除是唯一纠错动作，不保留收据状态筛选、作废原因或重开来源。

## Verification

- `npm test -- --runTestsByPath tests/cloud/receipt-create.spec.ts tests/cloud/receipt-delete.spec.ts tests/cloud/unit-detail-flow.spec.ts --runInBand` - passed.
- `npm run typecheck` - passed.
- `rg -n "billId:" miniprogram/pages/unit-detail/index.wxml` - no matches.

## User Setup Required

None.

## Next Phase Readiness

07-04 可以继续收口正式凭证排版、PDF 打印版导出、收据记录自动整理、全阶段回归和云函数部署清单。

---
*Phase: 07-收据管理与凭证体验补全*
*Completed: 2026-04-28*
