# Quick Task 260406-r7u: 交互重构（登录+四Tab）- Context

**Gathered:** 2026-04-06  
**Status:** Completed

## Task Boundary

在不改动核心领域模型和云端集合契约的前提下，完成小程序 IA 交互重构：

- 先登录/注册，再进入主应用
- 登录后固定底部四个 Tab：首页 / 业务维护 / 房源列表 / 我的
- 首页剥离维护中心职责，维护入口迁移到业务维护 Tab
- 我的页承接提醒设置、订阅状态、账号信息、退出登录
- 路由规范：Tab 使用 switchTab、二级页使用 navigateTo、登录登出使用 reLaunch
- 状态口径保持 Phase 3/4 一致，不新增平行状态体系

## Constraints Locked

- 保持现有提醒与异常口径：即将到期、已逾期、空置过久、人工异常（含维修高频）
- 保持首页、提醒中心、房源列表、详情页、维修记录联调链路可用
- 优先复用现有页面与服务，避免无谓重写

## Key Decisions

1. 采用最小迁移风险方案：保留 `pages/workbench/index` 路径作为首页 Tab，新建 `pages/ops/index` 与 `pages/profile/index`
2. 使用 `services/rentable-unit` 增加“临时筛选参数存储”，解决 Tab 不支持 query 的问题
3. 用 `requireAuthSession` + `App.onShow` 守卫统一登录态兜底，保证未登录回到 auth
