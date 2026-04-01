# Architecture Research

**Domain:** Personal landlord rent-collection WeChat Mini Program
**Researched:** 2026-04-01
**Confidence:** HIGH

## Standard Architecture

### System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                    WeChat Mini Program UI                  │
├─────────────────────────────────────────────────────────────┤
│  Home Dashboard  Houses/Rooms  Lease Detail  Imports      │
│  Alerts Center    Repair Logs   Settings      Notification │
└───────────────┬───────────────┬───────────────┬────────────┘
                │               │               │
┌───────────────┴─────────────────────────────────────────────┐
│                    Client Domain Layer                      │
├─────────────────────────────────────────────────────────────┤
│  Asset service  Lease service  Billing service  Alert rules │
│  Repair service Import parser  Recipient settings           │
└───────────────┬─────────────────────────────────────────────┘
                │
┌───────────────┴─────────────────────────────────────────────┐
│               Cloud Functions / Scheduled Jobs              │
├─────────────────────────────────────────────────────────────┤
│  Billing generation  Reminder dispatch  Import processing   │
│  Repair analytics    Data normalization                     │
└───────────────┬─────────────────────────────────────────────┘
                │
┌───────────────┴─────────────────────────────────────────────┐
│                   Cloud Database / Storage                  │
├─────────────────────────────────────────────────────────────┤
│  assets  rooms  tenants  leases  bills  repairs  alerts     │
│  recipients  imports  rule snapshots  audit logs            │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Home dashboard | Surface due-soon, vacant, and abnormal units | Client page aggregating cloud-query summaries |
| Asset / room module | Maintain asset hierarchy and current occupancy state | CRUD pages plus normalized asset/room collections |
| Lease / tenant module | Track current and historical tenancy | Lease lifecycle service and immutable history records |
| Billing module | Track rent, deposit, utility, property, and misc charges | Itemized bill records generated from lease rules |
| Reminder engine | Evaluate rules and dispatch reminders | Scheduled cloud functions with persisted rule snapshots |
| Repair module | Record and classify repairs, drive abnormality checks | Repair collection with category, date, tenancy context |
| Import module | Bulk ingest spreadsheet data safely | Upload + server-side parse + validation + preview + commit |

## Recommended Project Structure

```text
miniprogram/
├── app.ts
├── app.json
├── app.wxss
├── pages/
│   ├── home/
│   ├── houses/
│   ├── house-detail/
│   ├── lease-detail/
│   ├── repairs/
│   ├── alerts/
│   └── settings/
├── components/
│   ├── summary-card/
│   ├── status-tag/
│   ├── fee-list/
│   └── repair-chart/
├── services/
│   ├── asset.ts
│   ├── lease.ts
│   ├── billing.ts
│   ├── alert.ts
│   ├── repair.ts
│   └── import.ts
├── models/
│   ├── asset.ts
│   ├── lease.ts
│   ├── bill.ts
│   └── repair.ts
├── utils/
│   ├── dates.ts
│   ├── rules.ts
│   └── format.ts
└── types/
    └── wx.d.ts

cloudfunctions/
├── shared/
│   ├── schemas/
│   ├── constants/
│   └── calculators/
├── sync-bills/
├── evaluate-alerts/
├── send-reminders/
├── import-preview/
└── import-commit/
```

### Structure Rationale

- **`pages/`:** keeps landlord workflows task-oriented and easy to scan in a small product.
- **`services/` and `models/`:** separate UI logic from domain logic so reminder and billing rules can be tested.
- **`cloudfunctions/shared/`:** prevents duplicated validation or calculation logic across import, billing, and reminder jobs.

## Architectural Patterns

### Pattern 1: Lifecycle-centric lease records

**What:** Model each tenancy as a lease record with explicit start, end, billing rules, and tenant link.
**When to use:** Always, because history and reminder correctness depend on closed/open lease boundaries.
**Trade-offs:** Slightly more schema complexity up front, much cleaner history and analytics later.

### Pattern 2: Derived alert snapshots

**What:** Generate alert records from rules instead of computing every status directly in the UI.
**When to use:** For rent due, overdue, long vacancy, repair frequency spikes, and manual abnormality flags.
**Trade-offs:** Requires scheduled jobs, but makes the home dashboard fast and auditable.

### Pattern 3: Staged import pipeline

**What:** Upload -> parse -> validate -> preview -> commit, rather than direct import.
**When to use:** Always for Excel import because billing cycles and tenancy history are easy to corrupt.
**Trade-offs:** More implementation work than naive import, but dramatically safer.

## Data Flow

### Request Flow

```text
[User Action]
    ↓
[Page] → [Service] → [Cloud Function / Query] → [Cloud Database]
    ↓            ↓                ↓                     ↓
[UI State] ← [Transform] ← [Validation / Rules] ← [Stored Records]
```

### State Management

```text
[Page-local state]
    ↓
[Service methods] → [Cloud operations] → [Normalized data]
    ↓
[Rendered cards / lists / detail sections]
```

### Key Data Flows

1. **Lease to billing:** lease rule changes trigger bill generation or regeneration.
2. **Billing to alerts:** due/overdue calculations produce alert snapshots for dashboard and reminder dispatch.
3. **Repair to abnormality:** repair logs aggregate by room, house, and lease to detect high-frequency anomalies.
4. **Import to domain records:** parsed spreadsheet rows are validated, previewed, then committed in controlled batches.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k managed units | Single CloudBase project and monolithic cloud-function set is sufficient |
| 1k-10k managed units | Optimize indexes, precompute dashboard aggregates, split long-running import jobs |
| 10k+ managed units | Consider dedicated reporting jobs and stronger data partitioning |

### Scaling Priorities

1. **First bottleneck:** dashboard aggregation over bills and alerts — fix with precomputed summary collections.
2. **Second bottleneck:** bulk import and reminder scans — fix with batch jobs and time-windowed queries.

## Anti-Patterns

### Anti-Pattern 1: Treating house status as hand-maintained text

**What people do:** Store one manual “status” field and update it ad hoc.
**Why it's wrong:** It drifts from actual lease, vacancy, and repair data.
**Do this instead:** Derive operational status from lease, bill, alert, and repair records.

### Anti-Pattern 2: Mixing tenant history into mutable current-room fields

**What people do:** Overwrite current tenant fields and lose history.
**Why it's wrong:** Breaks per-tenant repair stats and historical traceability.
**Do this instead:** Keep immutable lease history and compute current occupancy from the active lease.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| WeChat login / identity | Native Mini Program auth | Single-user today, but keep recipient identity extension possible |
| WeChat subscription messages | Client consent + cloud dispatch | User must subscribe on the client before server-side reminder sending can succeed |
| Spreadsheet import | Server-side parse with `xlsx` | Prefer server-side validation to keep client lightweight |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| UI ↔ domain services | Direct method calls | Keep pages thin |
| Domain services ↔ cloud functions | Explicit API wrappers | Prevent page code from knowing low-level query details |
| Billing ↔ alerts | Shared calculators | Ensures due and overdue logic stays consistent |

## Sources

- https://developers.weixin.qq.com/miniprogram/dev/framework/
- https://developers.weixin.qq.com/miniprogram/dev/api/open-api/subscribe-message/wx.requestSubscribeMessage.html
- https://developers.weixin.qq.com/miniprogram/dev/wxcloudservice/wxcloud/basis/getting-started.html
- https://github.com/Tencent/tdesign-miniprogram
- https://github.com/freeleepm/mini-contract
- https://github.com/java110/WechatOwnerService

---
*Architecture research for: Personal landlord rent-collection WeChat Mini Program*
*Researched: 2026-04-01*
