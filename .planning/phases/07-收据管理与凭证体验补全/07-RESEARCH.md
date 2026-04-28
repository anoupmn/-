---
phase: 07-收据管理与凭证体验补全
type: research
status: synchronized
updated: 2026-04-28
---

# Phase 07 Research: 收据管理与凭证体验补全

## Current Product Truth

- 收据是租约月份级凭证：同一租约同一月份只能有一张有效收款收据。
- 收据不是费用细项凭证，房间详情不得在每个费用细项上放开收据按钮。
- 收据不包含收款人字段。
- 误开、不需要或测试生成的收据通过删除处理；删除会解除账单上的 `receiptId` 引用，使该租约月份可以重新开具。
- 收据记录页按月份自动分组整理，并可按房源、房间、租客筛选。
- 收据详情支持导出 PDF 打印版、复制摘要、分享凭证和删除。

## Requirement Mapping

| Requirement | Final Behavior |
| --- | --- |
| RCPT-03 | 用户可以从业务维护进入收据记录管理页，查看按月份整理的收据记录。 |
| RCPT-04 | 用户可以按月份、房源、房间、租客筛选收据，不需要状态筛选。 |
| RCPT-05 | 用户可以删除收据；删除后解除账单引用，允许重新开具。 |
| RCPT-06 | 同一租约同一月份的多笔已收租客账单合并为一张月度收据。 |
| RCPT-07 | 收据详情具备正式凭证排版，并支持 PDF 打印版、分享和复制摘要。 |
| RCPT-08 | 业务维护、收据记录、房间详情、收据详情形成闭环，界面不展示内部 ID。 |

## Architecture Notes

- `receipt-list` 从收据快照读取列表行，不从当前账单动态重算。
- `receipt-create` 接受 `leaseId + month`，后端校验租约、房间、租客、月份和有效收据重复。
- `receipt-lease-options` 返回当前可开收据的租约和月份，供收据记录页选择。
- `receipt-delete` 删除收据并清理账单引用。
- `receipt-pdf` 读取收据快照生成可打印 PDF。
- `rentable-unit-detail` 返回房间详情账单项和当前月份收据状态。

## UI Notes

- 业务维护 tab 放 `收据记录` 和 `月度经营导出`，首页只保留高频提醒与经营概览。
- 房间详情按月展示账单和收据入口：`开具本租约本月收据` / `查看本月收据`。
- 收据记录页需要自动整理能力，首屏应能看出每个月有哪些收据、总金额和异常空状态。
- 删除是破坏性动作，必须二次确认，并说明删除后可重新开具。
- 凭证视觉应正式、清晰、可打印，金额和日期使用稳定列宽。

## Verification Matrix

| Area | Command |
| --- | --- |
| Backend | `npm test -- --runTestsByPath tests/cloud/receipt-create.spec.ts tests/cloud/receipt-list.spec.ts tests/cloud/receipt-delete.spec.ts tests/cloud/receipt-pdf.spec.ts --runInBand` |
| UI static flow | `npm test -- --runTestsByPath tests/cloud/unit-detail-flow.spec.ts --runInBand` |
| Full regression | `npm test -- --runInBand && npm run typecheck` |

## Deprecated Ideas

以下方案已废弃，不再作为设计或实现依据：

- 收据作废流程。
- 收据重开流程。
- 收据状态筛选。
- 收款人字段。
- 每个费用细项独立开收据。
