# Quick Task 260406-r7u Summary

## Goal

完成“登录 + 四 Tab”交互重构，确保路由规范、入口归位和状态口径一致。

## Completed

- `app.json` 新增四 Tab 结构：`workbench / ops / units / profile`
- 首页（`workbench`）完成职责瘦身，仅保留经营盘面 + 异常摘要 + 今日建议 + 提醒入口
- 新增 `ops` 页面承接维护中心入口
- 新增 `profile` 页面承接提醒设置、订阅状态、账号信息、退出登录
- 首页与提醒中心跳转房源 Tab 改为 `switchTab + pending drilldown query`
- `units` 页面支持消费 pending drilldown、Tab 点击复位过滤器
- 路由规范已统一：Tab `switchTab`、二级页 `navigateTo`、登录/登出 `reLaunch`
- 新增登录态守卫：`requireAuthSession` 与 `App.onShow` 登录兜底
- 更新 `.planning/STATE.md` 与交互提案文档实施记录

## Verification

- `npm run typecheck` 通过
- `npm test -- --runInBand` 通过（21 suites / 37 tests）

## Notes

- 未改动核心云函数模型和集合契约
- 保持异常口径一致：即将到期、已逾期、空置过久、人工异常（含维修高频）
