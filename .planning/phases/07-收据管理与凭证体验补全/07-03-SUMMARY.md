---
phase: 07-收据管理与凭证体验补全
plan: 07-03
subsystem: receipt-ui
tags: [receipt-merge, void-reason, reissue, mini-program]
requires:
  - phase: 07-01
    provides: `receipt-create` 月份+房间合并创建和重复有效收据校验
provides:
  - 房间详情月度合并开具收据入口
  - 可纳入本月收据的已收账单候选展示
  - 收据作废原因输入弹窗
  - 作废时间与重开来源业务文案
affects: [unit-detail, receipt, rentable-unit-detail, receipt-create, receipt-void]
tech-stack:
  added: []
  patterns:
    - 前端只展示业务字段，内部 billId/receiptId 仅用于 dataset 和跳转
    - 作废原因由页面输入并 trim 后提交，后端继续执行必填校验
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
  - "房间详情调用 `createReceipt({ roomId, month })`，由后端最终裁决同房间、同租客、同租约、同月份和未重复开具。"
  - "候选账单展示费用名称、应收日期、实收日期和实收金额，不展示内部 billId。"
  - "收据页使用自定义作废弹窗和 `<textarea>`，移除硬编码作废原因。"
requirements-completed: [RCPT-05, RCPT-06, RCPT-08]
duration: 22 min
completed: 2026-04-28
---

# Phase 07 Plan 03: 合并开具、作废原因输入和重开追溯体验 Summary

**房间详情现在能对同月多笔已收租客账单合并开具收据，收据作废也必须填写原因，并在重开后显示可读来源。**

## Performance

- **Duration:** 22 min
- **Started:** 2026-04-28T05:08:00Z
- **Completed:** 2026-04-28T05:30:00Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- 房间详情月度账单区新增 `可纳入本月收据` 候选面板。
- 当同月存在 2 笔及以上已收、未开具收据的租客账单时，显示 `合并开具本月收据`。
- 合并开具成功后提示 `收据已生成` 并跳转到收据预览页。
- 已有有效收据的已收账单按钮改为 `已开具收据`，避免再次进入候选。
- 收据预览页新增 `填写作废原因` 自定义弹窗，空原因提示 `请输入作废原因`。
- 作废后的旧收据展示 `作废原因` 和 `作废时间`。
- 重开后的新收据展示 `由作废收据重开`，不显示旧收据内部 ID。

## Task Commits

1. **Task 1 + Task 2: 合并开具与作废原因体验** - `7e71639` (feat)

**Plan metadata:** pending follow-up docs commit

## Files Created/Modified

- `cloudfunctions/rentable-unit-detail/index.ts` / `.js` - 房间详情账单项返回 `responsibility`，供前端候选判断。
- `miniprogram/pages/unit-detail/index.ts` / `.js` - 计算收据候选账单，调用 `createReceipt({ roomId, month })`。
- `miniprogram/pages/unit-detail/index.wxml` - 候选面板、`合并开具本月收据` 和 `已开具收据` 文案。
- `miniprogram/pages/unit-detail/index.wxss` - 合并收据候选面板样式。
- `miniprogram/pages/receipt/index.ts` / `.js` - 作废原因输入、trim 校验和提交。
- `miniprogram/pages/receipt/index.wxml` - `<textarea>` 作废弹窗、作废时间、重开来源提示。
- `miniprogram/pages/receipt/index.wxss` - 作废弹窗样式。
- `tests/cloud/unit-detail-flow.spec.ts` - 静态断言合并开具、作废原因、重开追溯和内部 ID 不可见。

## Decisions Made

- 合并开具入口只在前端做可见候选筛选，最终不变量仍以 `receipt-create` 后端为准。
- 单笔已收账单仍保留原来的 `生成收据` 入口；多笔场景使用月度合并按钮。
- 重开来源只展示业务文案，不展示 `reissueFromReceiptId`。

## Deviations from Plan

None.

## Verification

- `npm test -- --runTestsByPath tests/cloud/receipt-create.spec.ts tests/cloud/receipt-void.spec.ts tests/cloud/unit-detail-flow.spec.ts --runInBand` - passed, 16 tests.
- `npm run typecheck` - passed.
- `rg -n "billId:" miniprogram/pages/unit-detail/index.wxml` - no matches.
- `rg -n "用户作废重开" miniprogram/pages/receipt/index.ts miniprogram/pages/receipt/index.wxml` - no matches.

## User Setup Required

None.

## Next Phase Readiness

07-04 可以继续收口正式凭证排版、保存/分享方案、全阶段回归和云函数部署清单。

---
*Phase: 07-收据管理与凭证体验补全*
*Completed: 2026-04-28*
