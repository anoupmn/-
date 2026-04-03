---
phase: 02-账单与房态视图
plan: 03
subsystem: ui
tags: [unit-list, unit-detail, billing-ui]
requires:
  - phase: 02-02
    provides: 列表/详情 bill 聚合结果
provides:
  - 房屋列表主状态卡片与风险标签展示
  - 单元详情摘要卡、月度账单与收款交互
  - 房源维护删除动作与租约维护固定费用表单收敛
affects: [daily-operations, dashboard]
tech-stack:
  added: []
  patterns: [summary-first-detail, action-oriented-list]
key-files:
  created: []
  modified:
    - miniprogram/pages/units/index.ts
    - miniprogram/pages/units/index.wxml
    - miniprogram/pages/unit-detail/index.ts
    - miniprogram/pages/unit-detail/index.wxml
key-decisions:
  - "列表第一屏优先展示主状态、风险标签和下一笔应收，不再渲染默认 0 值。"
  - "详情页把经营摘要卡和高频动作提到第一屏，历史信息默认折叠。"
  - "租约维护只录固定费用，水电/维修等浮动费用放到单元详情里按月补录。"
patterns-established:
  - "Pattern 1: 页面只消费后端摘要字段，状态文案仅做轻量映射。"
  - "Pattern 2: 月度账单中的每条费用项都可以独立登记缴费，月末补录动作放在当月列表尾部。"
requirements-completed: [ASST-04, BILL-02, BILL-04, LIST-02]
metrics:
  duration: 30min
  completed: 2026-04-03
---

# Phase 02 Plan 03: 页面视图 Summary

Phase 2 的账单与房态能力已经真正落到小程序界面里，列表和详情都能直接服务每天收租的高频场景。

## Accomplishments

- 列表页升级为主状态 + 风险标签卡片，支持搜索和长列表展开/收起。
- 详情页重构为摘要卡优先，展示当前租约、月度账单和历史折叠区。
- 在详情页接入“登记缴费”与“补录本月费用”动作，成功后刷新详情，不再走租约编辑心智。
- 房源维护补上“删除房源”能力；租约维护表单把固定费用和浮动费用说明拆清楚。

## Task Commits

1. **Task 1: 升级房屋列表为主状态 + 风险标签摘要卡** - `150be00` (feat)
2. **Task 2: 重构单元详情为摘要卡 + 费用分区 + 收款动作** - `01747d8` (feat)

## Verification

- `npm run typecheck`
- `npm test -- --runInBand`

## Post-debug Polish

- 月度账单里“补录本月费用”按钮下移到每个月账单列表底部，并缩小成辅助操作样式。
- 补录后的记录统一排在系统自动生成费用之后，避免打乱租金/管理费等固定项的阅读顺序。
- 房源维护页面增加“删除房源”按钮，删除时级联清理房间、租约和 bill，方便反复联调测试数据。

## Self-Check: PASSED

- SUMMARY file exists.
- Task commits `150be00` and `01747d8` exist in git history.
