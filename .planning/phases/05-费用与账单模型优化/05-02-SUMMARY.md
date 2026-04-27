---
phase: 05-费用与账单模型优化
plan: 05-02
subsystem: billing
tags: [wechat-miniprogram, cloudfunctions, zod, billing, lease-fees]

requires:
  - phase: 05-01
    provides: 写入边界治理、业务 id 更新与安全账单重算
provides:
  - 固定内置费用五项：租金、押金、管理费、消防押金、锁卡押金
  - 账单行费用性质、周期、押金类和一次性事实字段
  - 租约表单固定五项与自定义费用性质录入
affects: [05-03, 05-04, 05-05, phase-06, export, receipt]

tech-stack:
  added: []
  patterns: [费用性质事实字段, 押金类账单排除逾期与下一笔租金提示, shared 云函数副本同步]

key-files:
  created:
    - .planning/phases/05-费用与账单模型优化/05-02-SUMMARY.md
  modified:
    - cloudfunctions/shared/schemas/lease.ts
    - cloudfunctions/shared/schemas/bill.ts
    - cloudfunctions/shared/repositories/bill-repository.ts
    - cloudfunctions/shared/calculators/bill-status.ts
    - cloudfunctions/shared/calculators/rentable-unit.ts
    - miniprogram/pages/leases-form/index.ts
    - miniprogram/pages/leases-form/index.wxml
    - miniprogram/pages/leases-form/index.wxss
    - tests/cloud/bills-sync.spec.ts
    - tests/cloud/leases-save-billing.spec.ts
    - tests/domain/bill-status.spec.ts
    - tests/domain/rentable-unit-summary.spec.ts

key-decisions:
  - "账单判断使用 feeNature/isDepositLike 等事实字段，不再靠 label 或单一 type 推断"
  - "消防押金和锁卡押金作为押金类一次性应收进入账单，但不进入逾期提醒或下一笔租金核心提示"
  - "自定义费用性质从租约表单写入 feeRules.customFeeItems[].feeNature"

patterns-established:
  - "固定费用规则从 lease schema 归一化，再由 bill repository 映射到账单事实字段"
  - "押金类账单用 isBillOverdueTrackable 统一排除提醒和核心应收提示"
  - "根 shared 变更后同步到各云函数 shared 副本，保持独立部署一致性"

requirements-completed: [FEE-01, FEE-02, FEE-03, FEE-04]

duration: 45min
completed: 2026-04-28
---

# Phase 05-02: 固定费用、自定义费用与押金类一次性费用模型 Summary

**租约费用合同扩展为固定五项和显式费用性质，账单、提醒与详情提示可以直接消费事实字段。**

## Performance

- **Duration:** 45min
- **Started:** 2026-04-28T00:07:00+08:00
- **Completed:** 2026-04-28T00:52:30+08:00
- **Tasks:** 3
- **Files modified:** 181

## Accomplishments

- 固定费用新增管理费、消防押金和锁卡押金，并保留旧 `property` 读取兼容。
- 账单行新增 `feeNature`、`responsibility`、`cadence`、`isDepositLike`、`isOneTime`、`legacy`，让后续导出和收据不用再猜费用性质。
- 押金类账单不会变成逾期，也不会抢占下一笔租金核心提示。
- 租约表单支持固定五项、管理费周期切换和自定义费用性质必选校验。

## Task Commits

1. **Task 1-3: 固定费用模型、账单合同与租约表单** - `024e397` (feat)

## Files Created/Modified

- `cloudfunctions/shared/schemas/lease.ts` - 扩展租约费用规则、固定五项和自定义费用性质。
- `cloudfunctions/shared/schemas/bill.ts` - 扩展账单类型与费用事实字段。
- `cloudfunctions/shared/repositories/bill-repository.ts` - 将租约费用规则映射为带性质的系统账单。
- `cloudfunctions/shared/calculators/bill-status.ts` - 统一押金类和非租客责任账单的逾期排除口径。
- `cloudfunctions/shared/calculators/rentable-unit.ts` - 下一笔核心提示排除押金类账单。
- `miniprogram/pages/leases-form/index.ts` - 提交固定五项和自定义费用性质。
- `miniprogram/pages/leases-form/index.wxml` - 展示管理费、消防押金、锁卡押金和自定义费用性质选择。
- `tests/cloud/bills-sync.spec.ts` - 覆盖固定五项和押金类事实字段生成。
- `tests/cloud/leases-save-billing.spec.ts` - 覆盖管理费周期/一次性切换。
- `tests/domain/bill-status.spec.ts` - 覆盖押金类不逾期。
- `tests/domain/rentable-unit-summary.spec.ts` - 覆盖押金类不进入下一笔核心提示。

## Decisions Made

- 管理费默认 `cycle`，但允许保存为 `once`，对应账单 `feeNature: 'one_time'`。
- 消防押金和锁卡押金固定为 `cadence: 'once'`、`feeNature: 'deposit'`、`isDepositLike: true`。
- 旧 `property` 继续兼容读取并可标记 `legacy`，避免旧数据在后续统计中断链。

## Deviations from Plan

### Auto-fixed Issues

**1. 类型夹具补齐默认固定费用字段**
- **Found during:** Task 2 类型检查
- **Issue:** 既有单元测试 fixture 构造完整 `LeaseFeeRules` 时缺少新增固定费用字段。
- **Fix:** 给相关测试 fixture 补齐 `management`、`fireDeposit`、`lockCardDeposit` 默认值。
- **Files modified:** `tests/domain/rentable-unit-status.spec.ts`
- **Verification:** `npm run typecheck`
- **Committed in:** `024e397`

---

**Total deviations:** 1 auto-fixed
**Impact on plan:** 仅补齐类型 fixture，未扩大业务范围。

## Issues Encountered

- 云函数目录保留独立 `shared` 副本，因此根 shared 合同变更后需要同步到每个云函数目录，导致本次提交文件数较多。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

05-03 可以直接基于新的 `feeNature`/`cadence` 账单事实字段实现水电抄表计费；押金类和固定费用不会干扰下一笔租金提示。

---
*Phase: 05-费用与账单模型优化*
*Completed: 2026-04-28*
