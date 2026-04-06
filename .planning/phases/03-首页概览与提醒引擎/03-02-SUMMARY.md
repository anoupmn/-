---
phase: 03-首页概览与提醒引擎
plan: 02
subsystem: ui
tags: [miniprogram, dashboard, alerts, navigation, cloud-functions]
requires:
  - phase: 03-01
    provides: 首页聚合 payload、提醒分组 payload、主建议与人工异常底座
provides:
  - 首页驾驶舱 workbench 页面与首页聚合消费
  - 按规则类型分组的提醒中心页面
  - 首页卡片、异常行、主建议到可操作列表的钻取导航
affects: [03-03, dashboard, alerts, units]
tech-stack:
  added: []
  patterns: [page -> service -> cloud function, dashboard/alerts drill-down via units filters]
key-files:
  created:
    - miniprogram/pages/alerts/index.ts
    - miniprogram/pages/alerts/index.wxml
    - miniprogram/pages/alerts/index.wxss
    - miniprogram/pages/alerts/index.json
    - miniprogram/services/alert.ts
    - miniprogram/services/dashboard.ts
  modified:
    - miniprogram/app.json
    - miniprogram/pages/workbench/index.ts
    - miniprogram/pages/workbench/index.wxml
    - miniprogram/pages/workbench/index.wxss
    - miniprogram/pages/workbench/index.json
    - miniprogram/pages/units/index.ts
    - miniprogram/pages/units/index.wxml
    - miniprogram/services/rentable-unit.ts
key-decisions:
  - "首页与提醒中心统一钻取到现有 units 列表，而不是新增平行筛选页。"
  - "页面数据层改为预先生成显式 URL，避免在 Mini Program dataset 里传对象导致导航不稳定。"
patterns-established:
  - "Dashboard cards, abnormal rows, and recommendation all map to URL-based drill-down targets."
  - "Reminder-group navigation can enrich units filtering with alert room IDs when unit summary data alone is insufficient."
requirements-completed: [DASH-01, DASH-02, DASH-03, DASH-04, ALRT-05]
duration: 2min
completed: 2026-04-03
---

# Phase 03 Plan 02: 首页工作台与提醒列表前端消费 Summary

**小程序首页驾驶舱与按规则分组的提醒中心，直接消费首页聚合和提醒分组云函数并落到可操作列表**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-03T09:04:01Z
- **Completed:** 2026-04-03T09:06:23Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments
- `workbench` 从占位页升级为首页驾驶舱，按固定顺序展示概览卡、异常列表、主建议和提醒入口。
- 新增 `alerts` 页面，按 `即将到期`、`已逾期`、`空置过久`、`人工异常` 分组展示提醒并支持折叠。
- 首页卡片、异常行、提醒分组和提醒项都能钻取到现有房屋列表或单元详情继续处理。

## Task Commits

Each task was committed atomically:

1. **Task 1: 把 workbench 升级成首页驾驶舱** - `590c8de` (feat)
2. **Task 2: 交付按规则类型分组的提醒中心** - `6b7e9a3` (feat)

## Files Created/Modified
- `miniprogram/pages/workbench/index.ts` - 加载 `getHomeDashboard`，组织首页状态与钻取 URL。
- `miniprogram/pages/workbench/index.wxml` - 首页驾驶舱结构与中文运营文案。
- `miniprogram/pages/workbench/index.wxss` - 驾驶舱概览卡、异常列表、建议卡样式。
- `miniprogram/pages/alerts/index.ts` - 提醒中心分组加载、折叠和导航逻辑。
- `miniprogram/pages/alerts/index.wxml` - 提醒分组页面结构。
- `miniprogram/services/dashboard.ts` - 首页聚合云函数 service 封装。
- `miniprogram/services/alert.ts` - 提醒分组云函数 service 封装。
- `miniprogram/pages/units/index.ts` - 增加首页/提醒钻取过滤能力，并为人工异常补 alert room lookup。

## Decisions Made
- 复用现有 `units` / `unit-detail` 页面承接所有首页与提醒操作流，保持一个连续经营心智。
- 提醒分组默认展开最优先的前两类，其余分组可折叠，保证第一层先暴露最多、最急的问题。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] 补齐 units 列表的钻取过滤能力**
- **Found during:** Task 1 / Task 2
- **Issue:** 首页卡片、异常行和提醒分组原本只能落到未过滤的房屋列表，无法满足“进入对应可操作筛选列表”。
- **Fix:** 在 `units` 页面增加 query 解析、标题提示切换、异常房间过滤，以及人工异常所需的 alert room lookup。
- **Files modified:** `miniprogram/pages/units/index.ts`, `miniprogram/pages/units/index.wxml`, `miniprogram/services/rentable-unit.ts`
- **Verification:** `npm run typecheck`
- **Committed in:** `590c8de`, `6b7e9a3`

**2. [Rule 1 - Bug] 避免 Mini Program dataset 传对象导致导航不稳定**
- **Found during:** Task 2
- **Issue:** WXML `data-*` 直接承载对象在 Mini Program 运行时不稳定，会影响 drill-down 正确性。
- **Fix:** 改为在页面层预生成显式 URL，并统一通过 `navigateTo` 消费。
- **Files modified:** `miniprogram/pages/workbench/index.ts`, `miniprogram/pages/workbench/index.wxml`, `miniprogram/pages/alerts/index.ts`, `miniprogram/pages/alerts/index.wxml`
- **Verification:** `npm run typecheck`
- **Committed in:** `6b7e9a3`

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 bug)
**Impact on plan:** 都是为了保证首页和提醒页的钻取真正落到可处理列表，没有扩大业务范围。

## Issues Encountered
- 提醒中心里的 `人工异常` 不能只依赖 unit summary 推导，需要额外读取 alert groups 才能形成正确的筛选集合。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- 首页驾驶舱和提醒中心前端消费已落地，`03-03` 可以继续补提醒设置页与订阅管理。
- 首页已经保留提醒入口与轻量订阅状态，后续设置页只需承接长期规则管理。

## Self-Check
PASSED

---
*Phase: 03-首页概览与提醒引擎*
*Completed: 2026-04-03*
