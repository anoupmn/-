---
phase: 03-首页概览与提醒引擎
plan: 03
subsystem: notification
tags: [miniprogram, cloudfunctions, subscription, preferences, reminders]
requires:
  - phase: 03-01
    provides: 提醒分类、首页聚合、人工异常持久化事实
  - phase: 03-02
    provides: 首页驾驶舱与提醒中心入口
provides:
  - 提醒偏好读取/保存云函数
  - 首页一次性订阅引导与授权结果回写
  - 独立提醒设置页（按规则类型开关）
affects: [dashboard-home subscriptionState, workbench, reminder-settings, phase-05 notification pipeline]
tech-stack:
  added: []
  patterns: [page -> service -> cloud function, consent + enabledRuleTypes persistence]
key-files:
  created:
    - cloudfunctions/notification-preferences-get/index.ts
    - cloudfunctions/notification-preferences-save/index.ts
    - miniprogram/pages/reminder-settings/index.ts
    - miniprogram/pages/reminder-settings/index.wxml
    - miniprogram/pages/reminder-settings/index.wxss
    - miniprogram/pages/reminder-settings/index.json
    - miniprogram/services/notification.ts
    - tests/cloud/notification-preferences.spec.ts
  modified:
    - cloudfunctions/shared/repositories/notification-preference-repository.ts
    - cloudfunctions/dashboard-home/index.ts
    - cloudfunctions/shared/calculators/dashboard.ts
    - miniprogram/pages/workbench/index.ts
    - miniprogram/pages/workbench/index.wxml
    - miniprogram/services/dashboard.ts
    - miniprogram/app.json
    - miniprogram/config/notification.ts
    - miniprogram/config/notification.js
key-decisions:
  - "首页只承担订阅引导与设置入口，持续性规则管理放到 reminder-settings 页面。"
  - "提醒偏好以 consentState + hasRequested + enabledRuleTypes 持久化，不引入发送日志或阈值编辑。"
  - "manual_abnormal 与其他提醒类型共享同一套规则开关持久化。"
patterns-established:
  - "requestSubscribeMessage 结果立即写入 notification_preferences，页面随后刷新首页状态。"
  - "提醒设置页只操作规则类型数组，不改动提醒事实来源。"
requirements-completed: [NOTF-01, NOTF-03]
duration: 15 min
completed: 2026-04-06
---

# Phase 03 Plan 03: 订阅与规则开关闭环 Summary

**完成首页订阅引导、提醒设置页和提醒偏好持久化，为 Phase 5 消息发送闭环提供稳定配置事实。**

## Performance

- **Duration:** 15 min
- **Started:** 2026-04-06T10:25:00Z
- **Completed:** 2026-04-06T10:40:00Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments

- 新增 `notification-preferences-get/save` 云函数，支持按 landlord 读取与更新 `consentState`、`hasRequested`、`enabledRuleTypes`。
- 新增 `notification` 前端 service，封装提醒偏好读写与 `wx.requestSubscribeMessage` 调用结果处理。
- 新增 `reminder-settings` 页面，按规则类型提供开关管理（即将到期、已逾期、空置过久、人工异常）。
- 首页 `workbench` 接入一次性订阅引导：未请求时展示“开启提醒”，请求后展示“提醒设置”，并刷新状态文案。

## Verification

- `npm test -- --runInBand --runTestsByPath tests/cloud/notification-preferences.spec.ts tests/cloud/dashboard-home.spec.ts tests/cloud/alerts-list.spec.ts tests/cloud/manual-abnormal.spec.ts tests/domain/alert-evaluator.spec.ts`
- `npm run typecheck`

## Decisions Made

- `notification_preferences` 默认启用全部规则类型，避免初次进入设置页出现“全空”误解。
- 订阅授权被拒绝时也会写入状态，且仍允许用户进入设置页调整规则。
- 本阶段不处理真实模板消息发送，仅沉淀可复用的订阅与偏好事实。

## Deviations from Plan

None - plan executed within scope.

## Issues Encountered

- `workbench` 的 `consentState` 在 TS 严格模式下被推断为字面量，需要显式扩展为联合类型后通过 `typecheck`。

## User Setup Required

- 真实联调时，需要在 `miniprogram/config/notification.*` 中配置模板 ID；不再在 `services/notification.ts` 内硬编码占位值。

## Post-debug Follow-ups (2026-04-06)

- 追加完成云函数部署稳定性修复：依赖共享逻辑的函数支持独立部署，避免单函数上传时缺少 `shared` 模块。
- 追加完成提醒链路联调修复：缺集合自动创建、空查询删除兼容、提醒偏好更新避免写入 `_id`。
- 首页已补齐业务维护入口（房源、房间、租户、租约、房态总览），减少联调时的操作跳转成本。
- 当前仓库已在 `miniprogram/config/notification.*` 配置真实模板 ID；切换环境时需替换为目标环境模板 ID。

## Next Phase Readiness

- Phase 3 已具备首页概览、提醒分组、订阅状态与规则开关的完整闭环。
- Phase 5 可直接复用 `notification_preferences` 作为发送规则输入，不需重做用户配置层。

## Self-Check

PASSED

---
*Phase: 03-首页概览与提醒引擎*
*Completed: 2026-04-06*
