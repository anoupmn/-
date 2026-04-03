# Phase 03: 首页概览与提醒引擎 - Research

**Researched:** 2026-04-03
**Domain:** WeChat Mini Program dashboard aggregation, in-app alert snapshots, manual abnormal marking, and subscription-preference setup
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- 首页第一屏采用“数字概览卡 + 异常列表 + 今日建议”的驾驶舱结构，而不是待办清单优先。
- 顶部概览固定展示三类数字：`15 天内到期数量`、`当前空置数量`、`异常数量`。
- 第一屏的信息阅读顺序固定为：先看全局数字，再看异常列表，最后看建议动作。
- 应用内提醒默认按规则类型分组，而不是按房屋或房间分组。
- Phase 3 的提醒类型至少包括：`即将到期`、`已逾期`、`空置过久`、`人工异常`。
- 首页概览、异常列表和提醒中心要尽量共用同一套风险口径，降低每天切换视角的认知成本。
- 首页默认只突出一条“主建议”，不并列展示多条建议卡。
- 建议必须是可执行动作，而不是纯描述性文案；点击建议后直接进入对应筛选列表。
- 建议的目标是告诉用户“现在先做什么”，而不是重复展示原始状态统计。
- 订阅提醒采用“首页一次引导 + 设置页长期管理”的模式。
- 订阅后的提醒管理按规则类型开关，不在本阶段细化到更复杂的阈值或收件人层级配置。
- 首页可以承担首次订阅引导，但持续性的规则管理入口应落在独立设置页，而不是把复杂配置长期放在首页。
- 继续沿用 `asset -> room -> lease -> bills` 作为首页、提醒和建议的唯一事实来源，不新增平行真相字段。
- 页面层继续保持 `page -> service -> cloud function` 的薄页模式，首页和提醒页消费后端聚合结果，不在页面端自行拼装经营判断。
- “15 天内到期”继续沿用第 2 阶段已经锁定的统一窗口，首页、提醒和建议保持同口径。
- 首页交互目标仍然是“每天扫一眼就知道该收谁、哪里异常、下一步做什么”，不向报表或长篇分析页演化。

### the agent's Discretion
- 异常列表默认展示条数、排序细节和字段排布
- 主建议优先级打分细则与同分兜底规则
- 首页概览卡、提醒分组列表和设置页的视觉层次与按钮文案
- 提醒历史是否保留部分已处理记录，以及保留时长和折叠方式

### Deferred Ideas (OUT OF SCOPE)
- 微信订阅消息的实际发送闭环与模板消息投递
- 维修频次异常、主要维修类别和维修相关异常提醒
- 家人或合伙人作为提醒接收人
- 更复杂的提醒阈值、自定义优先级和多维通知策略
</user_constraints>

<research_summary>
## Summary

Phase 3 should build on top of the Phase 2 summary pipeline instead of inventing a separate dashboard model. The codebase already derives `mainStatus`, `riskTags`, `summaryHint`, `overdueDays`, and `vacancyDays` from lease and bill truth. The correct extension is to introduce a first-class `alerts` snapshot collection plus a dashboard aggregation cloud function that consumes lease, bill, room, and manual abnormal data and returns one coherent payload for the home page, reminder center, and recommendation card.

The critical product boundary is that Phase 3 does **not** send WeChat messages yet. It only handles consent and rule preferences for future use, plus current in-app reminders. That means the right architecture is:

1. persist rule-based alert snapshots for dashboard/reminder UI,
2. persist manual abnormal flags separately from derived billing risk,
3. expose a home aggregate payload and reminder list payload,
4. capture `requestSubscribeMessage` consent state and rule-type toggles without attempting message dispatch.

**Primary recommendation:** create shared alert evaluators and repositories, then implement `dashboard-home`, `alerts-list`, `alerts-upsert-manual`, and `notification-preferences` cloud-function/service flows. Reuse `workbench` as the dashboard home and add dedicated reminder/settings pages for deeper interaction.
</research_summary>

<standard_stack>
## Standard Stack

No new framework is required for the recommended Phase 3 shape.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.8.x | Alert snapshot typing, dashboard DTOs, preference contracts | Already used across cloud functions and miniprogram services |
| Zod | 4.3.x | Schema validation for alert, manual abnormal, and preference payloads | Matches existing shared schema pattern |
| dayjs | 1.11.x | 15-day due window, vacancy-age calculations, alert timestamps | Already used in current lifecycle calculators |
| Jest + ts-jest | 30.x / 29.4.x | Alert evaluation and dashboard aggregation regression tests | Existing domain/cloud test harness already in place |

### Platform
| Capability | Purpose | When to Use |
|------------|---------|-------------|
| `wx.requestSubscribeMessage` | Capture user subscription consent for future reminder delivery | Phase 3 only records consent/result; no server-side send yet |
| WeChat native page routing | Drill from overview card / suggestion / alert row into actionable list | Keep the same thin-page navigation style used by `units` and `unit-detail` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Persisted `alerts` snapshot collection | Compute dashboard/reminder UI directly on every page load from `units + bills` | Simpler short-term, but duplicates classification logic and makes future push delivery harder |
| Separate dashboard-only status model | Reuse Phase 2 `rentable-unit` summary + enrich with manual abnormal and alert metadata | A separate model would drift from existing list/detail logic |
| Full notification engine in Phase 3 | Consent + rule preference only | Full send pipeline belongs to Phase 5 and would over-expand scope |

**Installation:**
```bash
# No new package is required for the recommended Phase 3 shape.
```
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Project Structure
```text
cloudfunctions/
├── shared/
│   ├── calculators/
│   │   ├── rentable-unit.ts
│   │   ├── dashboard.ts
│   │   └── alert-evaluator.ts
│   ├── repositories/
│   │   ├── alert-repository.ts
│   │   ├── abnormal-flag-repository.ts
│   │   └── notification-preference-repository.ts
│   ├── schemas/
│   │   ├── alert.ts
│   │   ├── abnormal-flag.ts
│   │   └── notification-preference.ts
│   └── constants/
│       ├── collections.ts
│       └── statuses.ts
├── dashboard-home/
├── alerts-list/
├── alert-manual-flag-save/
└── notification-preferences-save/

miniprogram/
├── services/
│   ├── dashboard.ts
│   ├── alert.ts
│   └── notification.ts
└── pages/
    ├── workbench/
    ├── alerts/
    └── reminder-settings/
```

### Pattern 1: Derived alert snapshots
**What:** Evaluate due-soon, overdue, vacancy-too-long, and manual abnormal conditions into explicit alert snapshot records.
**When to use:** For all Phase 3 dashboard/reminder experiences.
**Example:**
```typescript
type AlertType = 'expiring' | 'overdue' | 'vacancy_long' | 'manual_abnormal';

type AlertSnapshot = {
  id: string;
  roomId: string;
  assetId: string;
  type: AlertType;
  level: 'info' | 'warning' | 'danger';
  title: string;
  summary: string;
  actionTarget: {
    page: 'units' | 'unit-detail';
    query: Record<string, string>;
  };
  active: boolean;
  createdAt: string;
  updatedAt: string;
};
```

### Pattern 2: Manual abnormal as separate fact
**What:** Store human-entered abnormal flags separately from derived bill/lease risks.
**When to use:** For `ALRT-04`, because manual abnormal is user intent, not a derivative of billing truth.
**Example:**
```typescript
type ManualAbnormalFlag = {
  roomId: string;
  reason: string;
  active: boolean;
  createdAt: string;
  clearedAt?: string | null;
};
```

### Pattern 3: Dashboard aggregate DTO
**What:** Return one home payload containing overview counts, top abnormal rows, one recommended action, and subscription prompt state.
**When to use:** For `workbench` home rendering, to preserve thin-page behavior.
**Example:**
```typescript
type HomeDashboardPayload = {
  overviewCards: Array<{
    key: 'expiring' | 'vacant' | 'abnormal';
    label: string;
    count: number;
    actionQuery: Record<string, string>;
  }>;
  abnormalRows: Array<{
    roomId: string;
    displayName: string;
    primaryReason: string;
    supportingText: string;
  }>;
  recommendation: {
    label: '今日建议';
    title: string;
    actionLabel: '立即处理';
    actionQuery: Record<string, string>;
  } | null;
  subscriptionState: {
    hasRequested: boolean;
    enabledRuleTypes: string[];
  };
};
```

### Pattern 4: Consent and preference split
**What:** Separate “user granted Mini Program subscription prompt” from “which rule types are enabled”.
**When to use:** Always for Phase 3 because `NOTF-01` and `NOTF-03` are in scope while actual sending is not.
**Example:**
```typescript
type NotificationPreference = {
  landlordId: string;
  consentState: 'unknown' | 'accepted' | 'rejected';
  enabledRuleTypes: Array<'expiring' | 'overdue' | 'vacancy_long' | 'manual_abnormal'>;
  updatedAt: string;
};
```

### Anti-Patterns to Avoid
- **Computing dashboard cards independently from reminder grouping:** creates count mismatches between home and alerts center.
- **Reusing `abnormal` solely as Phase 2 overdue synonym:** Phase 3 must support both derived overdue abnormal and manual abnormal.
- **Blocking dashboard use until subscription consent:** violates Phase 3 scope and degrades daily workflow.
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dashboard truth in page TS | Ad hoc filtering/sorting inside `workbench/index.ts` | One cloud-function aggregate payload | Matches the thin-page rule and keeps counts aligned |
| Manual abnormal embedded in room doc text fields | One-off `room.manualStatus` flags | Dedicated abnormal-flag schema/repository | Preserves lifecycle, reason text, and future auditability |
| Notification setup as permanent home-page form | Inline switch matrix on dashboard | Lightweight prompt on home + dedicated settings page | Matches locked UX decision and keeps home scan-friendly |

**Key insight:** the hardest Phase 3 problem is not layout; it is keeping home counts, alert groups, and recommended action derived from one consistent evaluation pass.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Dashboard and alerts use different filters
**What goes wrong:** Home says 5 abnormalities, reminder center shows 4 or 6.
**Why it happens:** The two views compute from different query paths or different age thresholds.
**How to avoid:** Produce both from the same shared evaluator and repository layer.
**Warning signs:** Duplicate “15 days” logic in multiple files or separate danger-count implementations.

### Pitfall 2: Manual abnormal becomes a UI-only badge
**What goes wrong:** User can mark something abnormal, but the flag does not appear in reminder center or future notifications.
**Why it happens:** The implementation stores the flag only in page-local state or loose room notes.
**How to avoid:** Persist manual abnormal as a structured fact and fold it into alert snapshot generation.
**Warning signs:** No abnormal schema, no tests covering manual flag persistence, no reminder row for manual abnormal.

### Pitfall 3: Subscription consent is mistaken for delivery success
**What goes wrong:** UI claims reminders are “enabled” as if messages will definitely be sent immediately.
**Why it happens:** `wx.requestSubscribeMessage` result is treated as a full notification pipeline.
**How to avoid:** Copy and data model must say this phase captures permission and rule switches only; actual send remains Phase 5.
**Warning signs:** No separate preference storage, or user-facing wording promises delivered messages now.
</common_pitfalls>

<code_examples>
## Code Examples

Verified patterns from the current repository:

### Existing summary derivation
```typescript
// Source: cloudfunctions/shared/calculators/rentable-unit.ts
if (riskTags.includes(BILL_RISK_TAGS.overdue)) {
  summaryHint = `已逾期 ${overdueDays} 天`;
} else if (outstandingBills.some((bill) => isBillWithinUpcomingWindow(bill, now))) {
  summaryHint = '15 天内有账单到期';
} else if (mainStatus === UNIT_MAIN_STATUSES.vacant && vacancyDays > 0) {
  summaryHint = `已空置 ${vacancyDays} 天`;
}
```

### Existing home entry point
```typescript
// Source: miniprogram/pages/workbench/index.ts
async onShow() {
  const session = await bootstrapAuthSession();
  if (!session) {
    await wx.reLaunch({ url: '/pages/auth/index' });
    return;
  }
  this.setData({
    isLoggedIn: true,
    displayName: session.displayName
  });
}
```

### Existing thin service wrapper pattern
```typescript
// Source: miniprogram/services/rentable-unit.ts
export function listRentableUnits() {
  return callCloudFunction('rentable-units-list');
}
```
</code_examples>

<validation_architecture>
## Validation Architecture

Phase 3 can stay Nyquist-compliant by verifying each data layer independently before wiring UI:

1. **Shared evaluator tests**
   - lock alert-type classification for expiring, overdue, long vacancy, and manual abnormal
   - lock recommendation selection priority
2. **Cloud aggregation tests**
   - lock `dashboard-home` overview counts, abnormal rows, recommendation payload, and drill-down queries
   - lock `alerts-list` grouping and filter consistency
3. **Mini Program type + rendering checks**
   - lock `workbench`, `alerts`, and `reminder-settings` page bindings through `npm run typecheck`
   - verify page WXML references the right DTO fields
4. **Manual verification**
   - WeChat subscription consent flow requires manual validation because it depends on client prompt behavior

Recommended split:
- Wave 1 verifies backend alert truth and aggregate payloads.
- Wave 2 verifies dashboard/reminder pages consuming those payloads.
- Wave 3 verifies subscription consent capture and settings persistence.
</validation_architecture>

<recommendation>
## Planning Recommendation

Split Phase 3 into three executable plans:

1. **Plan 03-01:** alert domain and dashboard aggregation
   - new schemas/repositories/calculators
   - manual abnormal persistence
   - home aggregate + alerts list cloud functions
2. **Plan 03-02:** dashboard home and reminder center UI
   - upgrade `workbench`
   - add `alerts` page
   - add drill-down queries and one primary recommendation card
3. **Plan 03-03:** notification preference capture and settings UI
   - `wx.requestSubscribeMessage`
   - dedicated reminder settings page
   - rule-type switches and persistence

This keeps the shared truth in place before page rendering, and keeps Phase 5 delivery logic cleanly deferred.
</recommendation>

---
*Research completed: 2026-04-03*
