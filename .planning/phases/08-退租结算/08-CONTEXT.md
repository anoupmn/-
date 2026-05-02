# Phase 08: 退租结算 - Context

**Gathered:** 2026-05-02
**Status:** Ready for planning
**Source:** PRD Express Path (.planning/phases/08-退租结算/enhancement-退租结算方案.md)

<domain>
## Phase Boundary

结束租约（`leases-end`）前增加统一结算流程：
1. 水电费读表催收提醒（复用现有 `createMeterBill`）
2. 退余下租金（按天折算，生成 `rent_refund` 账单）
3. 退押金（生成 `deposit_refund` 账单）
4. 自动作废未来未收系统账单
5. 月度导出"退租支出明细"自动从退款账单查询

**不涉及：** 不做独立结算模块（一切走 bills）、不在退租云函数中实现水电读表、不做线上自动退款、不做押金抵扣逻辑。
</domain>

<decisions>
## Implementation Decisions

### Schema Changes
- **D-01:** `billTypeSchema` 新增 `'rent_refund' | 'deposit_refund'` 两种账单类型
- **D-02:** `responsibility` 从 `z.literal('tenant')` 扩展为 `z.enum(['tenant', 'landlord'])`，`'landlord'` 表示房东应退款项，`amount` 保持正数

### End-Lease Logic
- **D-03:** `endLease()` 新增可选参数 `settlement?: SettlementOptions`，不传时保持现有行为向后兼容
- **D-04:** `SettlementOptions.voidFutureSystemBills` — 退租时删除该租约 `dueDate > closedAt` 的未收系统账单，按物理删除处理（匹配现有点的 `syncBillsForLease` 惯例）
- **D-05:** `SettlementOptions.rentRefundDays` — 按 `rentAmount / billingCycleDays × days` 生成 `type='rent_refund'` 账单，期满结束（days=0）时不生成
- **D-06:** `SettlementOptions.refundDeposit/refundFireDeposit/refundLockCardDeposit` — 各生成一条 `type='deposit_refund'` 账单，金额=对应押金金额

### Frontend Settlement Panel
- **D-07:** 点击"结束租约"改为弹出"退租结算"面板，不直接执行 `endLease()`。面板展示：未收账单汇总、水电费最后录入日期（超30天标红）、余下租金预估（天数可手动调整）、押金退还勾选
- **D-08:** 水电费区点击跳转现有补录弹窗（`openManualBillDialog`），不新开水电录入入口
- **D-09:** 确认结算调用 `endLease({ leaseId, settlement: { voidFutureSystemBills, rentRefundDays, refundDeposit, ... } })`

### Export Report Sync
- **D-10:** `report-export-repository.ts` 中退租支出从硬编码 `0` 改为查询当月 `responsibility='landlord'` 且 `type` 为 `rent_refund|deposit_refund` 的账单总额
- **D-11:** "退租支出明细" sheet 从 `[]` 改为查询当月 landlord 责任退款账单，字段：房源、房间、租客、租约期间、支出类型、金额、日期、备注

### the agent's Discretion
- 退余下租金天数默认值 = `max(0, endDate - today)`，前端面板可调整
- 赔偿账单 `feeNature` 统一用 `one_time`，`section` 按类型分区
- `endLease()` 返回新增 `settlementSummary` 字段用于前端展示操作摘要
- 押金金额从 `lease.depositAmount` 和 `getLeaseFeeRules(lease)` 获取
- 退款账单 `source` 标记为 `'system'`
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schema & Data Model
- `cloudfunctions/shared/schemas/bill.ts` — Bill 类型、section、responsibility 定义，需扩展
- `cloudfunctions/shared/schemas/lease.ts` — Lease schema，含 `feeRules`、`depositAmount`
- `cloudfunctions/shared/constants/collections.ts` — 集合常量

### Lease Lifecycle
- `cloudfunctions/shared/repositories/lease-repository.ts` — `endLease()`、`getLeaseDeleteBlockers()`、`deleteLeaseSafely()`
- `cloudfunctions/leases-end/index.ts` — 云函数入口，需扩展参数
- `cloudfunctions/leases-end/shared/repositories/lease-repository.ts` — 自有副本，需同步更新
- `cloudfunctions/shared/calculators/lease-lifecycle.ts` — `closeLeaseAndDeriveUnitStatus()`

### Billing
- `cloudfunctions/shared/repositories/bill-repository.ts` — `syncBillsForLease()`、`createMeterBill()`、`markBillReceived()`
- `miniprogram/services/lease.ts` — 前端服务层 `endLease()`、`deleteLease()`

### Frontend
- `miniprogram/pages/unit-detail/index.ts` — 详情页，需改造 `handleEndLease()`、新增结算面板
- `miniprogram/pages/unit-detail/index.wxml` — 详情页模板，需新增结算面板 UI
- `miniprogram/pages/unit-detail/index.wxss` — 样式

### Export
- `cloudfunctions/shared/repositories/report-export-repository.ts` — 月度导出，需改造退租支出逻辑
- `cloudfunctions/shared/schemas/report-export.ts` — 导出 schema

### Reference Document
- `.planning/phases/08-退租结算/enhancement-退租结算方案.md` — 完整技术方案（PRD）
</canonical_refs>

<specifics>
## Specific Ideas

1. 退租结算面板是半屏弹窗（复用现有 `dialog-card` 样式模式）
2. 余下租金公式：`rentAmount / billingCycleDays × rentRefundDays`，向上取整到 2 位小数
3. 退款账单 `note` 字段记 `退余下租金 N天` 或 `退还押金`，方便识别
4. 水电费"最后录入日期"从 `detail.monthlyBillGroups` 中找最后一条 `type='water'/'electricity'` 的 `dueDate`
5. 未收账单统计复用现有接口，不新增云函数
</specifics>

<deferred>
## Deferred Ideas

- 不做"押金部分抵扣维修费"（房东手动取消勾选）
- 不做管理费/物业费等周期性费用退还
- 不做自动线上退款（退款账单仅作记录）
- 不做独立结算记录集合（一切走 bills）

No external deferred ideas — scope fully bounded by PRD.

</deferred>

---

*Phase: 08-退租结算*
*Context gathered: 2026-05-02 via PRD Express Path*
