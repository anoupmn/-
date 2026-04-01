---
phase: 01-核心数据骨架
plan: 01
subsystem: infra
tags: [wechat-mini-program, typescript, jest, cloudbase]
requires: []
provides:
  - 微信小程序原生工程骨架
  - TypeScript 类型检查脚本
  - Jest 测试入口与小程序/云函数测试桩
affects: [auth, domain, ui, testing]
tech-stack:
  added: [typescript, jest, ts-jest, miniprogram-api-typings, tdesign-miniprogram]
  patterns: [thin-app-bootstrap, reusable-test-helpers]
key-files:
  created:
    - package.json
    - package-lock.json
    - project.config.json
    - tsconfig.json
    - jest.config.cjs
    - miniprogram/app.ts
    - miniprogram/app.json
    - miniprogram/pages/workbench/index.ts
    - tests/helpers/mock-wx.ts
    - tests/helpers/mock-cloud.ts
  modified:
    - .gitignore
key-decisions:
  - "应用启动阶段不做业务引导，把会话恢复留给后续认证计划显式处理。"
  - "Jest 允许零 spec 通过，确保基础设施阶段不会因为暂未编写业务测试而阻塞。"
  - "微信与云能力 mock 统一收敛到 tests/helpers，后续页面和云函数测试共享同一套桩。"
metrics:
  duration: 45min
  completed: 2026-04-01
---

# Phase 01 Plan 01: 工程与测试基座 Summary

原生微信小程序工程、工作台占位页和 Jest 测试基座已经落地，后续认证、领域和云函数计划可以直接在同一底座上增量开发。

## Performance

- **Duration:** 45 min
- **Tasks:** 2
- **Files modified:** 17

## Accomplishments

- 建立了可被微信开发者工具识别的原生小程序工程结构，固定 `miniprogram/` 与 `cloudfunctions/` 根目录。
- 配置了 TypeScript 检查脚本和最小工作台页，保证应用入口不混入未来认证或业务逻辑。
- 建立 Jest 测试入口，并提供可复用的 `wx` 与云数据库测试桩，供后续计划直接复用。

## Task Commits

1. **Task 1: 初始化原生微信小程序 TypeScript 工程** - `696b228` (feat)
2. **Task 2: 建立 Jest 与云函数测试辅助桩** - `537d2b4` (test)

## Decisions Made

- 保持 `app.ts` 极简，只负责应用启动。
- 当前阶段只注册 `pages/workbench/index`，避免提前引用未来页面。
- 云数据库测试桩直接支持 `where/get/update/remove` 与 `doc(id)`，降低后续计划重复造轮子的成本。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] 允许零 spec 的基础设施阶段通过 Jest**
- **Found during:** Task 2
- **Issue:** 本计划只建立测试基座，默认 Jest 在零 spec 时会以失败退出。
- **Fix:** 在 `jest.config.cjs` 中启用 `passWithNoTests`。
- **Files modified:** `jest.config.cjs`
- **Verification:** `npm test -- --runInBand`
- **Commit:** already present before this task delta; validated in this plan

**2. [Rule 3 - Blocking] 忽略微信开发者工具生成的私有配置文件**
- **Found during:** Task 2 verification
- **Issue:** `project.private.config.json` 作为本地运行产物会污染工作树，影响原子提交。
- **Fix:** 将其加入 `.gitignore`。
- **Files modified:** `.gitignore`
- **Commit:** `e4c3ef1`

## Known Stubs

None.

## Verification

- `npm run typecheck`
- `npm test -- --runInBand`

## Self-Check: PASSED

- SUMMARY file exists.
- Task commits `696b228`, `537d2b4`, `e4c3ef1` exist in git history.
