---
phase: 07-收据管理与凭证体验补全
plan: 07-04
subsystem: receipt-voucher
tags: [receipt-preview, pdf, lease-month-receipt, share, clipboard, regression, deployment]
requires:
  - phase: 07-01
    provides: 收据列表、合并开具、作废与重开后端约束
  - phase: 07-02
    provides: 收据记录管理页和业务维护入口
  - phase: 07-03
    provides: 合并开具入口、作废原因输入和重开追溯体验
provides:
  - 正式收款凭证排版
  - 租约 + 月份口径开具收据
  - PDF 打印版导出
  - 页面分享收据能力
  - 复制收据摘要保存/分享兜底
  - Phase 07 全链路回归记录
  - 云函数部署/同步清单
affects: [receipt, receipt-records, unit-detail, ops, receipt-list, receipt-create, receipt-get, receipt-void, receipt-lease-options, receipt-pdf, rentable-unit-detail]
tech-stack:
  added:
    - 手写 PDF 云函数输出，使用 PDF 标准 CJK 字体 `STSong-Light`
  avoided:
    - pdfmake / jsPDF 依赖
  patterns:
    - 小程序页面分享使用 `onShareAppMessage`
    - 保存/分享兜底使用 `wx.setClipboardData`
key-files:
  modified:
    - miniprogram/pages/receipt/index.ts
    - miniprogram/pages/receipt/index.wxml
    - miniprogram/pages/receipt/index.wxss
    - miniprogram/pages/receipt-records/index.ts
    - miniprogram/pages/receipt-records/index.wxml
    - miniprogram/pages/unit-detail/index.ts
    - cloudfunctions/shared/repositories/receipt-repository.ts
    - tests/cloud/unit-detail-flow.spec.ts
  created:
    - cloudfunctions/receipt-lease-options/index.ts
    - cloudfunctions/receipt-pdf/index.ts
    - tests/cloud/receipt-pdf.spec.ts
    - .planning/phases/07-收据管理与凭证体验补全/07-04-SUMMARY.md
key-decisions:
  - "收据开具口径修正为 `leaseId + month`；旧 `roomId + month` 仅保留后端兼容，不再作为页面主入口。"
  - "正式凭证支持 PDF 打印版导出，同时保留页面分享 + 复制摘要。"
  - "收据页继续消费 receipt 快照 items，不从当前账单重新计算明细。"
  - "重开来源和跳转继续使用业务文案，不展示内部 ID 标签。"
requirements-completed: [RCPT-03, RCPT-04, RCPT-05, RCPT-06, RCPT-07, RCPT-08]
duration: 26 min
completed: 2026-04-28
---

# Phase 07 Plan 04: 正式凭证预览、保存分享和阶段回归 Summary

**Phase 07 已收口：收据现在按租约月份开具，能查、筛、作废填原因、重开追溯，并支持 PDF 打印版、页面分享和复制摘要。**

## Performance

- **Duration:** 26 min
- **Started:** 2026-04-28T05:31:00Z
- **Completed:** 2026-04-28T05:57:00Z
- **Tasks:** 2
- **Files modified:** 5 code/test files + planning docs

## Accomplishments

- 收据预览页改为正式凭证结构，固定标题 `收款收据（非发票）` 并突出收据编号。
- 凭证排版包含收据编号、房源/房间、租客、收款日期、收款项目明细、合计金额、收款人、备注、生成时间、作废状态、作废原因、作废时间和重开来源提示。
- 收款项目明细按收据快照 `items` 渲染，展示项目名称、应收日期、实收日期和金额。
- 收据创建主口径修正为 `leaseId + month`，每个租约每个月开一张收据。
- 收据记录页新增 `按租约开收据`，可选择租约和该租约下可开收据月份。
- 房间详情的月度收据入口改为 `开具本租约本月收据`，调用 `createReceipt({ leaseId, month })`。
- 新增 `receipt-lease-options` 云函数，为收据记录页返回可开收据的租约和月份。
- 新增 `receipt-pdf` 云函数，生成可打印 PDF 并上传云存储。
- 收据页新增 `导出PDF打印版`，下载并打开 PDF。
- 作废态增加 `已作废` 标识，保持内容可读。
- 新增 `onShareAppMessage()`，分享路径为 `/pages/receipt/index?receiptId=...`。
- 新增 `复制收据摘要`，通过 `wx.setClipboardData` 复制包含标题、收据编号、房源/房间、租客、合计金额、收款日期和状态的摘要。
- `tests/cloud/unit-detail-flow.spec.ts` 增加正式凭证、分享、复制、无 PDF 链路和内部 ID 不可见静态断言。

## Phase 07 Requirement Coverage

- `RCPT-03`: 收据记录管理页可从业务维护进入并查看收据卡片列表。
- `RCPT-04`: 收据记录支持月份、房源、房间、租客、状态筛选。
- `RCPT-05`: 作废收据必须输入原因；旧收据展示作废原因和作废时间。
- `RCPT-06`: 支持同一租约同月多笔已收租客账单开具一张月度收据，并由后端防重复有效收据。
- `RCPT-07`: 收据预览具备正式凭证排版，支持 PDF 打印版、页面分享和复制摘要。
- `RCPT-08`: 业务维护、收据记录、收据预览、房间详情之间形成闭环，不展示内部 ID 标签。

## Task Commits

1. **Task 1: 正式凭证排版与分享/复制兜底** - `1e416d2` (feat)

**Plan metadata:** pending follow-up docs commit

## Verification Results

- `npm test -- --runTestsByPath tests/cloud/receipt-create.spec.ts tests/cloud/receipt-list.spec.ts tests/cloud/receipt-pdf.spec.ts tests/cloud/unit-detail-flow.spec.ts tests/cloud/receipt-void.spec.ts --runInBand` - passed, 25 tests.
- `npm test -- --runInBand` - passed, 32 suites / 105 tests.
- `npm run typecheck` - passed.
- `rg -n "receiptId:" miniprogram/pages/receipt/index.wxml` - no matches.
- `rg -n "jspdf|pdfmake" miniprogram/pages/receipt cloudfunctions package.json` - no matches.

## Manual Verification Notes

- `miniprogram/app.json` includes `pages/receipt/index` and `pages/receipt-records/index`.
- 业务维护入口进入 `pages/receipt-records/index`。
- 收据记录页可以选择租约和月份，点击 `开具该租约本月收据`。
- 收据记录卡片通过 `查看收据` 进入 `pages/receipt/index?receiptId=...`，通过 `回到房间` 进入 `pages/unit-detail/index?roomId=...`。
- 房间详情已收账单可进入收据页；租约月份候选可走 `开具本租约本月收据`。
- 收据页可点击 `导出PDF打印版`，云函数生成 PDF 后下载并打开。
- 页面可见文案使用收据编号、房源/房间、租客、状态、金额等业务字段，不展示 `receiptId:`、`billIds` 等内部标签。

## Deployment Checklist

需要上传/更新的云函数：

- `receipt-list`：Phase 07 新增收据记录列表能力，必须上传。
- `receipt-lease-options`：新增租约月份开具选项，必须上传。
- `receipt-create`：包含 `leaseId + month` 月度开具、重复有效收据防护、重开来源写入，需上传。
- `receipt-get`：消费最新 shared receipt repository/schema，需同步上传。
- `receipt-void`：包含作废原因必填和作废快照保留，需上传。
- `receipt-pdf`：新增 PDF 打印版导出，必须上传。
- `rentable-unit-detail`：账单项增加 `responsibility` 给房间详情候选判断，需上传。

共享副本同步：

- `cloudfunctions/shared/repositories/receipt-repository.ts`
- `cloudfunctions/receipt-create/shared/repositories/receipt-repository.ts`
- `cloudfunctions/receipt-get/shared/repositories/receipt-repository.ts`
- `cloudfunctions/receipt-void/shared/repositories/receipt-repository.ts`
- `cloudfunctions/receipt-list/shared/repositories/receipt-repository.ts`
- `cloudfunctions/receipt-lease-options/shared/repositories/receipt-repository.ts`
- `cloudfunctions/receipt-pdf/shared/repositories/receipt-repository.ts`
- `cloudfunctions/rentable-unit-detail/index.ts` / `.js`

## Deviations from Plan

None.

## Issues Encountered

None.

## User Setup Required

- 部署上述云函数后，在微信开发者工具中重新编译小程序。
- 线上若已有旧云函数，需要确认 `receipt-create`、`receipt-void`、`receipt-list`、`receipt-lease-options`、`receipt-pdf` 的 shared 目录与本地一致。

## Phase Completion

Phase 07 已完成 4/4。下一步可以进入整体 UAT，重点手工走一遍：

1. 业务维护 -> 收据记录 -> 查看收据。
2. 收据记录 -> 按租约开收据 -> 选择租约和月份 -> 收据预览。
3. 房间详情 -> 开具本租约本月收据 -> 收据预览。
4. 收据预览 -> 导出PDF打印版。
5. 收据预览 -> 填写作废原因 -> 重开收据。
6. 收据预览 -> 复制收据摘要 / 分享凭证。

---
*Phase: 07-收据管理与凭证体验补全*
*Completed: 2026-04-28*
