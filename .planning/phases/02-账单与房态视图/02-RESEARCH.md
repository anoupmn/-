# Phase 02: 账单与房态视图 - Research

**Researched:** 2026-04-03
**Domain:** WeChat Mini Program billing ledger, rentable-unit status derivation, and detail/list information architecture
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- 费用结构采用“固定大类 + 可追加其他费用”的模式。
- 默认固定费用大类至少包括：房租、押金、水费、电费、物业费。
- 除固定大类外，允许在租约下追加多个“其他费用项”，用于覆盖少量特殊费用。
- 系统不仅维护租约上的费用规则，还要生成每期具体应收记录，后续状态、详情和提醒均以具体记录为准，而不是只在前端临时推导。
- “已收”必须通过录入收款日期和收款金额产生，不使用纯布尔标记。
- Phase 2 不引入“部分收款”状态；一笔费用在录入收款日期和金额后即视为已收。
- 押金不纳入逾期心智；房租、水电、物业、杂费和追加的其他应交费用可以进入逾期状态。
- 费用状态粒度固定为：`待收 / 今日到期 / 已收 / 逾期`。
- 房态采用“主状态 + 风险标签”的表达方式，而不是把所有状态压成单一互斥枚举。
- 主状态只表达占用关系：`已出租 / 待入住 / 空置`。
- 风险标签单独表达经营风险：`即将到期 / 已逾期 / 异常`。
- “即将到期”的统一阈值为 15 天内，和首页未来要使用的时间窗口保持一致。
- Phase 2 内“异常”先只由逾期触发；人工标记异常不提前纳入本阶段范围。
- 单元可以同时呈现主状态和风险标签，例如“已出租 + 即将到期”或“已出租 + 已逾期 + 异常”。
- 详情页采用“混合摘要优先”的第一屏结构，先展示当前经营摘要，再进入租约和账单细节。
- 第一屏摘要必须优先展示：主状态、风险标签、当前租户、下一笔应收日期、下一笔应收金额、逾期提示。
- 第一屏高频动作固定为：`登记收款` 和 `查看全部账单`。
- 历史租约和历任租户仍保留在详情页，但默认折叠，当前经营信息优先。
- 费用展示按三块分区：`房租`、`押金`、`非房租类费用`。
- “非房租类费用”统一承载水费、电费、物业费、杂费以及追加的其他费用项。
- 不为追加费用开放用户自定义归类；追加项默认归入“非房租类费用”。
- 继续沿用 `房源 -> 房间 -> 租约` 作为唯一核心事实来源，不新增与租约平行的“当前账单摘要真相字段”。
- 页面层继续保持 `page -> service -> cloud function` 的薄页模式，不在页面端自行推导房态或账单真相。
- 列表与详情继续优先服务“每天扫一眼就知道该收谁、哪间房异常”的房东经营场景。

### the agent's Discretion
- 分项费用录入表单的具体排版和分组方式
- 详情页摘要卡的具体视觉层次与字段标签文案
- “今日到期”与“逾期”在列表/详情中的颜色或标签样式
- 账单列表按时间、类型或状态的具体排序细节

### Deferred Ideas (OUT OF SCOPE)
- 首页概览卡片、应用内提醒、规则型建议与订阅设置
- 人工标记异常与提醒联动
- 维修记录、维修统计和维修异常分析
- Excel 导入账单与费用数据
- 微信官方提醒消息发送闭环
</user_constraints>

<research_summary>
## Summary

Phase 2 should extend the existing Phase 1 lease-centric model rather than replacing it. The codebase already has stable lease lifecycle calculation, current rentable-unit summary derivation, thin miniprogram services, and cloud-function-backed list/detail flows. The correct implementation path is to add a dedicated `bills` collection and shared billing calculator/repository layer, then feed enriched billing truth back into rentable-unit list/detail aggregation.

The key structural decision is to separate three concerns cleanly: lease fee rules, generated bill instances, and derived unit status. Fee rules belong on the lease because they define intent. Concrete bill rows belong in a `bills` collection because status, received date, and later reminders need immutable period-level facts. Rentable-unit status should stay derived from lease + bills, not hand-maintained, to preserve auditability and avoid UI drift.

**Primary recommendation:** add a first-class billing ledger (`bills`) with shared status calculators, then update list/detail aggregators to expose `mainStatus`, `riskTags`, summary amounts, and fee-section views for the existing miniprogram pages.
</research_summary>

<standard_stack>
## Standard Stack

The established tools already present in this repo are sufficient; Phase 2 should not introduce a new data layer or UI library.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.8.x | Domain typing for lease/bill/status contracts | Already used across cloud functions and miniprogram services |
| Zod | 4.3.x | Schema validation for bill entities and bill-rule inputs | Existing shared schema pattern in `cloudfunctions/shared/schemas` |
| dayjs | 1.11.x | Due-date, overdue, and 15-day risk-window calculations | Already used in current lifecycle calculators |
| Jest + ts-jest | 30.x / 29.4.x | Domain and cloud-function regression tests | Existing test harness already covers Phase 1 domain + cloud logic |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tdesign-miniprogram | 1.13.x | Optional lightweight UI primitives | Use only if Phase 2 UI needs a stable tag/button/input primitive that native controls cannot express cleanly |
| @cloudbase/wx-cloud-client-sdk | 1.8.x | Existing CloudBase client integration | Continue existing service wrappers; no direct page-level use |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Shared bill schema + repository | Inline cloud-function-specific payload parsing | Faster initially, but duplicates fee-status logic across save/list/detail flows |
| Persisted `currentStatus` field on room | Derived status from lease + bills | Persisted status is simpler short-term but drifts and breaks downstream alerts |
| Reusing `lease.rentAmount` as the only billing source | Dedicated `bills` collection | Reuse is smaller, but cannot represent itemized fees or receipt history correctly |

**Installation:**
```bash
# No new package is required for the recommended Phase 2 shape.
```
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Project Structure
```text
cloudfunctions/
├── shared/
│   ├── calculators/
│   │   ├── lease-lifecycle.ts
│   │   ├── bill-status.ts
│   │   └── rentable-unit.ts
│   ├── repositories/
│   │   ├── lease-repository.ts
│   │   └── bill-repository.ts
│   ├── schemas/
│   │   ├── lease.ts
│   │   └── bill.ts
│   └── constants/
│       ├── collections.ts
│       └── statuses.ts
├── bills-sync/
├── bills-receive/
├── rentable-units-list/
└── rentable-unit-detail/

miniprogram/
├── services/
│   ├── lease.ts
│   ├── bill.ts
│   └── rentable-unit.ts
└── pages/
    ├── units/
    └── unit-detail/
```

### Pattern 1: Lease rule + bill instance split
**What:** Keep recurring fee intent on the lease, but generate concrete bill rows per fee type and period.
**When to use:** Always for Phase 2 because the product needs `待收 / 今日到期 / 已收 / 逾期` at item granularity.
**Example:**
```typescript
type LeaseFeeRule = {
  kind: 'rent' | 'deposit' | 'water' | 'electricity' | 'property' | 'misc' | 'custom';
  amount: number;
  cadence: 'once' | 'per_cycle';
  dueOffsetDays: number;
};

type Bill = {
  id: string;
  leaseId: string;
  roomId: string;
  type: LeaseFeeRule['kind'];
  dueDate: string;
  amount: number;
  status: 'pending' | 'due_today' | 'paid' | 'overdue';
  receivedAt: string | null;
  receivedAmount: number | null;
};
```

### Pattern 2: Shared status derivation
**What:** Calculate fee status and unit risk tags in shared calculators, then consume those outputs in list/detail cloud functions.
**When to use:** For all Phase 2 query paths, especially `rentable-units-list` and `rentable-unit-detail`.
**Example:**
```typescript
const mainStatus = activeLease ? 'occupied' : futureLease ? 'pending_move_in' : 'vacant';
const riskTags = [
  hasDueWithin15Days ? 'expiring_soon' : null,
  hasOverdueBill ? 'overdue' : null,
  hasOverdueBill ? 'abnormal' : null
].filter(Boolean);
```

### Pattern 3: Thin receipt action
**What:** Treat "登记收款" as a focused update to an existing bill record rather than mutating lease totals.
**When to use:** For Phase 2 payment registration, because partial payments are explicitly deferred.
**Example:**
```typescript
await markBillReceived(db, {
  billId,
  receivedAt,
  receivedAmount
});
```

### Anti-Patterns to Avoid
- **Storing one mutable "current bill snapshot" on lease:** breaks historical traceability and makes import/reminder work harder later.
- **Computing fee status in WXML/TS pages:** duplicates business logic and conflicts with the existing thin-page pattern.
- **Displaying placeholder zero values for non-applicable hints:** the UI-SPEC explicitly says `逾期天数` / `空置天数` should appear only when meaningful.
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date math for recurring due dates | Manual `Date` loops scattered in cloud functions | Centralize on `dayjs` in shared calculators | Existing code already uses it; avoids timezone and inclusive-boundary drift |
| Input validation for bill payloads | Ad hoc field checks per cloud function | Shared Zod schema for bill + receipt payloads | Keeps save/list/detail/receive aligned |
| Page-level aggregation for summary cards | Per-page array filtering and sorting | Enriched cloud-function payloads | Required by the thin-page pattern and avoids duplicated risk-tag logic |

**Key insight:** Phase 2 complexity is not visual; it is consistency of billing truth. Shared calculators and schemas are cheaper than debugging drift later.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Fee rules and bill instances collapse into one shape
**What goes wrong:** The implementation keeps one array on lease and toggles status directly there.
**Why it happens:** It looks simpler than introducing a `bills` collection.
**How to avoid:** Keep lease fee rules as source intent; derive or sync concrete bill records separately.
**Warning signs:** No standalone bill schema, no `receivedAt`, no period identity.

### Pitfall 2: Overdue becomes the only unit status
**What goes wrong:** List/detail UI loses the distinction between occupancy state and risk state.
**Why it happens:** The Phase 1 `currentStatus` enum is reused unchanged.
**How to avoid:** Split `mainStatus` from `riskTags`, then expose both in the query DTO.
**Warning signs:** Payload only contains one status string; UI cannot show “已出租 + 即将到期”.

### Pitfall 3: Detail page buries current operations under history again
**What goes wrong:** Current rent collection information appears after history blocks because Phase 1 detail layout is reused directly.
**Why it happens:** Existing page structure is convenient to extend incrementally.
**How to avoid:** Return a top-level summary card payload and fee sections first; history stays folded.
**Warning signs:** WXML renders `leaseHistory` before current bill sections, or always shows historical rows above receipt actions.
</common_pitfalls>

<code_examples>
## Code Examples

Verified patterns from the current repository:

### Existing lifecycle derivation
```typescript
// Source: cloudfunctions/shared/calculators/lease-lifecycle.ts
export function deriveLeaseStatus(lease: Pick<Lease, 'startDate' | 'endDate' | 'closedAt'>, now: string) {
  const today = dayjs(now);
  if (lease.closedAt) return LEASE_STATUSES.ended;
  if (today.isBefore(dayjs(lease.startDate), 'day')) return LEASE_STATUSES.future;
  if (today.isAfter(dayjs(lease.endDate), 'day')) return LEASE_STATUSES.ended;
  return LEASE_STATUSES.active;
}
```

### Existing list aggregation pattern
```typescript
// Source: cloudfunctions/shared/calculators/rentable-unit.ts
return {
  roomId: room.id,
  assetId: asset.id,
  displayName: room.isWholeUnitDefault ? asset.name : `${asset.name} · ${room.name}`,
  currentStatus,
  currentTenantName: tenant?.name ?? '',
  nextReceivableDate,
  nextReceivableAmount,
  hasAbnormal: currentStatus === UNIT_STATUSES.overdue
};
```

### Existing thin service wrapper pattern
```typescript
// Source: miniprogram/services/rentable-unit.ts
export function getRentableUnitDetail(payload: Record<string, unknown>) {
  return callCloudFunction('rentable-unit-detail', payload);
}
```
</code_examples>

<validation_architecture>
## Validation Architecture

Phase 2 can stay Nyquist-compliant with the existing Jest + ts-jest setup. The critical move is to add tests at the same three layers Phase 1 already uses:
- shared domain calculator tests for bill status and unit-risk-tag derivation
- cloud-function tests for bill sync / receipt registration / detail aggregation
- miniprogram typecheck for updated page/service payloads

The fastest stable sampling loop is:
- per task commit: run targeted Jest specs for the touched domain or cloud function
- per wave: run the full `npm test -- --runInBand` plus `npm run typecheck`
- before phase verification: run the same full suite with all new billing specs included
</validation_architecture>

<open_questions>
## Open Questions

1. **Bill generation trigger timing**
   - What we know: Phase 2 needs concrete bill rows and Phase 1 already creates/updates leases through cloud functions.
   - What's unclear: whether bills should be generated only on lease save, or also regenerated when rules change later.
   - Recommendation: plan for sync-on-create and sync-on-update inside lease/bill repositories; do not introduce scheduled generation yet.

2. **How “查看全部账单” is surfaced in UI**
   - What we know: UI-SPEC requires the action and detail page remains the main screen.
   - What's unclear: separate page vs in-page expansion.
   - Recommendation: keep it in-page for Phase 2 unless implementation complexity clearly drops with a dedicated page; the user decision only locks the action, not the navigation target.
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- `.planning/phases/02-账单与房态视图/2-CONTEXT.md` — locked product decisions
- `.planning/phases/02-账单与房态视图/02-UI-SPEC.md` — locked UI contract
- `.planning/REQUIREMENTS.md` — requirement IDs and wording for Phase 2
- `.planning/ROADMAP.md` — phase goal and success criteria
- `cloudfunctions/shared/calculators/lease-lifecycle.ts` — current lifecycle source of truth
- `cloudfunctions/shared/calculators/rentable-unit.ts` — current list summary source of truth
- `cloudfunctions/rentable-unit-detail/index.ts` — current detail aggregation contract
- `tests/helpers/mock-cloud.ts` — current cloud-function test harness

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md` — recommended `asset -> room -> lease -> bills / repairs / alerts` architecture
- `.planning/research/PITFALLS.md` — detail-page and status-model risks relevant to Phase 2
- `.planning/research/SUMMARY.md` — roadmap implication that billing must precede dashboard/reminders
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: CloudBase cloud functions + miniprogram service/page layer
- Ecosystem: existing TypeScript, Zod, dayjs, Jest setup
- Patterns: billing ledger design, derived status composition, thin-page aggregation
- Pitfalls: status drift, detail-page hierarchy regression, bill/rule conflation

**Confidence breakdown:**
- Standard stack: HIGH - Phase 2 fits the existing repo stack without adding tools
- Architecture: HIGH - local code and prior project research point to the same `lease -> bills -> derived status` shape
- Pitfalls: HIGH - mostly project-specific and directly visible from current Phase 1 structure
- Code examples: HIGH - all examples are from current repository files

**Research date:** 2026-04-03
**Valid until:** 2026-05-03
</metadata>

---
*Phase: 02-账单与房态视图*
*Research completed: 2026-04-03*
*Ready for planning: yes*
