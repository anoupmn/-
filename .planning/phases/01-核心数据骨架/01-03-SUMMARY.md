---
phase: 01-核心数据骨架
plan: 03
subsystem: api
tags: [domain-model, cloudfunctions, repositories, mini-program-services]
requires:
  - phase: 01-01
    provides: 工程与测试基座
  - phase: 01-02
    provides: landlord 会话入口
provides:
  - 核心资产/房间/租户/租约领域契约
  - 快速录入与分步维护云函数
  - 列表/详情查询和前端 service 通道
affects: [ui, dashboard, imports]
tech-stack:
  added: [zod, dayjs]
  patterns: [asset-room-lease-hierarchy, thin-client-service-wrapper]
key-files:
  created:
    - cloudfunctions/shared/calculators/lease-lifecycle.ts
    - cloudfunctions/shared/calculators/rentable-unit.ts
    - cloudfunctions/quick-entry/index.ts
    - cloudfunctions/rentable-units-list/index.ts
    - cloudfunctions/rentable-unit-detail/index.ts
  modified:
    - tests/helpers/mock-cloud.ts
key-decisions:
  - "整租仍统一落到房源 -> 默认整租单元 -> 租约模型。"
  - "客户端 service 统一只包装 wx.cloud.callFunction，不直接碰集合。"
patterns-established:
  - "Pattern 1: 单 active lease 校验在仓储层入口统一执行。"
  - "Pattern 2: 列表和详情都从共享计算器与标准化数据聚合得到。"
requirements-completed: [ASST-01, ASST-02, ASST-03, LEASE-01, LEASE-02, LEASE-03, LEASE-04, LEASE-05, LIST-01, IMPT-01]
metrics:
  duration: 55min
  completed: 2026-04-01
---

# Phase 01 Plan 03: 领域与后端通道 Summary

Phase 1 的核心业务模型、生命周期规则以及手动录入与查询通道已经一次性打通，页面层现在只需要接现成 service 而不需要再发明业务规则。

## Performance

- **Duration:** 55 min
- **Tasks:** 2
- **Files modified:** 33

## Accomplishments

- 用测试锁定了整租/分租模型、单 active lease 约束和可出租单元摘要字段。
- 实现了快速录入、资产/房间/租户/租约维护、结束租约、经营列表和详情查询云函数。
- 提供了与云函数一一对应的前端 service 包装，保证页面层只走统一调用路径。

## Task Commits

1. **Task 1: 用测试锁定核心领域契约与生命周期规则** - `7603864` (feat)
2. **Task 2: 实现快速录入、分步维护、列表与详情的后端通道** - `1e18d18` (feat)

## Decisions Made

- 默认整租单元由后端在 whole 模式建档时自动创建，避免前端手工重复录入。
- `rentable-units-list` 与 `rentable-unit-detail` 统一基于共享领域数据聚合，不让页面自行推导房态。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] 统一补上共享运行时层**
- **Found during:** Task 2
- **Issue:** 多个云函数都需要同一套数据库解析、OPENID 获取和数据聚合逻辑，若分散实现后续极易漂移
- **Fix:** 新增 `cloudfunctions/shared/runtime.ts` 作为共享运行时支持层
- **Files modified:** `cloudfunctions/shared/runtime.ts`
- **Verification:** `npm run typecheck`, cloud function specs
- **Committed in:** `1e18d18`

---

**Total deviations:** 1 auto-fixed (Rule 2: 1)
**Impact on plan:** 只是把必需的共用基础抽出来，没有扩大业务范围。

## Issues Encountered

列表和详情查询刚开始缺少显式类型约束，补齐共享泛型与返回结构后，TypeScript 和测试一起稳定下来。

## User Setup Required

None - current verification uses mocked cloud adapters.

## Verification

- `npm test -- --runTestsByPath tests/domain/lease-lifecycle.spec.ts tests/domain/rentable-unit-summary.spec.ts`
- `npm test -- --runTestsByPath tests/cloud/quick-entry.spec.ts tests/cloud/entity-save.spec.ts tests/cloud/rentable-units-list.spec.ts tests/cloud/rentable-unit-detail.spec.ts`
- `npm run typecheck`

## Self-Check: PASSED

- SUMMARY file exists.
- Task commits `7603864` and `1e18d18` exist in git history.

