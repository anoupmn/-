---
phase: 01-核心数据骨架
plan: 02
subsystem: auth
tags: [wechat-login, session, cloudfunction, mini-program]
requires:
  - phase: 01-01
    provides: 微信小程序工程与测试基座
provides:
  - landlord 登录云函数
  - 本地会话恢复与清理服务
  - 认证页与登录后安全落点页
affects: [ui, domain, cloudfunctions]
tech-stack:
  added: []
  patterns: [explicit-auth-bootstrap, session-via-cloud-function]
key-files:
  created:
    - cloudfunctions/login/index.ts
    - miniprogram/services/auth.ts
    - miniprogram/pages/auth/index.ts
    - tests/auth/auth-service.spec.ts
  modified:
    - miniprogram/app.json
    - miniprogram/pages/workbench/index.ts
key-decisions:
  - "认证页显式触发会话恢复，不把身份逻辑塞进 app.ts。"
  - "登录后统一只跳到 workbench，避免提前依赖未来页面。"
patterns-established:
  - "Pattern 1: 客户端通过 wx.cloud.callFunction 获取 landlord 会话。"
  - "Pattern 2: 本地缓存只保存会话快照，不保存额外身份真值。"
requirements-completed: [AUTH-01, AUTH-02]
metrics:
  duration: 30min
  completed: 2026-04-01
---

# Phase 01 Plan 02: 登录与会话 Summary

微信登录、会话持久化和登录后的安全落点页已经连通，Phase 1 后续写入与查询都可以建立在稳定 landlord 会话之上。

## Performance

- **Duration:** 30 min
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments

- 实现了基于 `OPENID` 的 landlord 登录云函数，并把登录结果落到 `landlord_users` 集合语义上。
- 提供了 `bootstrapAuthSession()`、`loginAsLandlord()`、`clearSession()` 三个认证服务接口。
- 交付了认证页与工作台安全落点页，确保登录流只引用当前已存在页面。

## Task Commits

1. **Task 1: 实现 landlord 登录云函数与本地会话服务** - `0a0530f` (feat)
2. **Task 2: 实现认证页与工作台落点页并修复未来引用** - `a1dec06` (feat)

## Decisions Made

- 使用 `RZB_SESSION_KEY` 作为唯一会话缓存键，避免页面层分散管理本地身份状态。
- 登录成功和会话恢复都使用 `wx.reLaunch({ url: '/pages/workbench/index' })`，保证单一安全落点。

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

认证测试最初把云函数导入当成带 `.main` 的对象调用，修正为直接调用导出的 `main` 函数后通过。

## User Setup Required

真实微信登录与云开发联调仍需要后续在开发者工具中补齐 AppID 和 CloudBase 环境，但本计划的本地自动化测试不依赖外部配置。

## Verification

- `npm test -- --runTestsByPath tests/auth/auth-service.spec.ts`
- `npm run typecheck`

## Self-Check: PASSED

- SUMMARY file exists.
- Task commits `0a0530f` and `a1dec06` exist in git history.

