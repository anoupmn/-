# 收租吧

## What This Is

收租吧是一个面向个人房东自用的微信小程序，用来管理大约 80 间房屋与房间的收租、租户、费用和异常状态。它的核心是让房东每天打开首页就能快速知道哪些房间快到期、哪些已经逾期、哪些空置过久、哪些存在维修或人工标记异常，并通过微信官方可用的提醒能力接收待办提醒。

## Core Value

让我每天打开小程序就能立刻知道该收谁的租、哪间房有异常、下一步该处理什么。

## Requirements

### Validated

- [x] 支持“房源/资产 -> 房间 -> 租约”的兼容型结构，同时覆盖整套出租和分房出租两种场景
- [x] 支持房屋列表、房屋详情、当前租户信息和历任租户档案查询
- [x] 支持手动录入房屋、房间、租户和租约基础数据

Validated in Phase 1: 核心数据骨架

### Active

- [ ] 支持“房源/资产 -> 房间 -> 租约”的兼容型结构，同时覆盖整套出租和分房出租两种场景
- [ ] 支持按租约单独配置不固定租金周期，并管理房租、押金、水电、物业和其他杂费
- [ ] 提供首页概览、异常提醒和规则型建议，让房东快速识别 15 天内到期、空置和异常房屋
- [ ] 记录维修历史，并能统计每套房、每任租户期间的维修次数和主要维修类别
- [ ] 支持 Excel 导入房屋、租约、租户及账单数据
- [ ] 先支持房东本人微信提醒，后续预留扩展到家人或合伙人的能力

### Out of Scope

- [ ] 租客端小程序或租客自助功能 — 第一版聚焦房东本人管理效率
- [ ] 多房东 SaaS 化与复杂权限体系 — 当前只服务单一账号和个人使用场景
- [ ] 高保真 UI 与品牌设计 — 第一阶段以黑字白底、功能优先为主，视觉深化后续再做
- [ ] 智能定价、自动催收等复杂 AI 策略 — 第一版先做稳定可解释的规则型建议

## Context

这是一个全新绿地项目，当前目录下没有历史代码，也没有现成的数据模型包袱。用户明确希望优先复用现成能力和开源案例，避免重复造轮子，尤其要关注微信小程序生态中的成熟基础设施、表格导入方案、提醒能力封装和房屋管理类数据结构实践。

业务对象是个人房东本人，管理规模约 80 间房，房型既有整套出租，也有一个房源下多个房间分别出租。首页最重要的是快速概览，尤其是 15 天内到期房屋数量、空置房屋数量和异常房屋列表。异常定义已明确包括即将到期、逾期、空置过久、租客反馈维修、维修频次过高和人工标记。

数据层面需要从第一版就考虑历史可追踪性，包括历任租户信息、不同租约规则、分项账单和维修统计。用户当前没有现成 Excel 模板，因此导入模板可以按系统设计重新定义。维修记录第一版采用固定分类并允许附加备注，便于后续统计主要问题类型。

## Constraints

- **Platform**: 必须以微信小程序为主要交付形态 — 用户日常使用入口已经明确
- **Audience**: 第一版只服务单一房东账号 — 先把个人使用体验做扎实，再考虑多人提醒
- **Data Model**: 必须兼容“房源/资产 -> 房间 -> 租约”层级结构 — 同时适配整租和分租
- **Notifications**: 提醒能力必须基于微信官方可用通道实现 — 关系到可上线和长期稳定性
- **UX**: 第一版采用黑字白底、功能优先的朴素风格 — 暂不把设计复杂度引入首轮开发
- **Implementation**: 优先采用成熟开源方案和官方能力 — 降低试错成本，避免重复造轮子

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 第一版定位为个人房东自用工具 | 目标用户单一，优先把真实使用场景跑通 | — Pending |
| 采用“房源/资产 -> 房间 -> 租约”作为核心模型 | 需要同时兼容整租和分房出租两种业务形态 | — Pending |
| 费用模型从第一版开始支持分项账单 | 后续统计、提醒和对账都依赖细粒度费用结构 | — Pending |
| 微信提醒先只支持本人，预留扩展多人接收 | 先降低实现复杂度，同时不堵死后续家人/合伙人扩展 | — Pending |
| 首页优先展示 15 天内到期、空置数量与异常列表 | 这是用户每天打开后最关心的管理视图 | — Pending |
| 异常建议先采用规则型触发 | 先保证建议稳定、可解释、可落地 | — Pending |
| 维修记录采用固定分类 + 备注 | 兼顾统计分析和实际记录灵活性 | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check - still the right priority?
3. Audit Out of Scope - reasons still valid?
4. Update Context with current state

## Current State

Phase 1 and Phase 2 complete. Phase 3 is in progress (2/3 plans complete). 项目已经具备 landlord 登录、核心数据骨架、手动建档、经营列表、详情历史、结束租约闭环、账单与房态视图，以及首页驾驶舱和按规则分组的提醒中心。

---
*Last updated: 2026-04-06 after Phase 3 Plan 02 completion*
