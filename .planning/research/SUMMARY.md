# Project Research Summary

**Project:** 收租吧
**Domain:** Personal landlord rent-collection WeChat Mini Program
**Researched:** 2026-04-01
**Confidence:** HIGH

## Executive Summary

This product is best treated as a focused landlord operations tool, not a tenant platform and not a generalized SaaS rental system. The strongest implementation path is a native WeChat Mini Program paired with WeChat cloud development, because your core value depends on official reminder capability, low operational overhead, and fast delivery inside the WeChat ecosystem.

The most important product insight from research is that the “daily action cockpit” matters more than broad feature count. Inventory structure, lease lifecycle, split billing, reminders, and repair history form the real backbone. UI, advanced analytics, and multi-user collaboration should stay secondary until the daily rent-collection workflow is trustworthy.

The main risks are structural, not cosmetic: choosing the wrong house/room model, handling reminders only in the UI, and importing spreadsheet data without validation. If we avoid those three mistakes early, the rest of v1 can move quickly.

## Key Findings

### Recommended Stack

Use the native WeChat Mini Program framework with CloudBase, TypeScript, cloud functions, and a thin but reliable component layer from `tdesign-miniprogram`. Pair that with `dayjs` for due-date logic, `zod` for input validation, and `xlsx` for spreadsheet import. This keeps the stack small, aligned with official platform capabilities, and suitable for a single-user operational product.

**Core technologies:**
- WeChat Mini Program native framework: primary client runtime — needed for login and official reminder flow
- WeChat CloudBase: backend, database, functions, and scheduled jobs — lowest-friction backend path
- TypeScript: domain safety for leases, bills, alerts, and repair records

### Expected Features

The table stakes are clear: asset/room inventory, lease and tenant tracking, split fee ledger, reminders, vacancy tracking, tenant history, and repair records. The strongest differentiators for your specific use case are rule-based suggestions and repair-frequency analytics by house and by tenant period.

**Must have (table stakes):**
- Asset / room inventory
- Lease and tenant lifecycle
- Split billing for rent, deposit, utilities, property, and misc fees
- Due / overdue / vacancy / abnormality reminders
- Repair log with category tracking
- Excel import and manual entry

**Should have (competitive):**
- Rule-based operational suggestions
- Repair frequency analytics by unit and tenant tenure
- Fast operational home dashboard

**Defer (v2+):**
- Family / partner reminder recipients
- Tenant-side interactions
- Rich BI and advanced recommendation systems

### Architecture Approach

The cleanest structure is `asset -> room -> lease -> bills / repairs / alerts`, with cloud functions owning scheduled evaluation and import validation. The UI should remain thin: dashboard pages render already-derived alert and summary data instead of recomputing operational truth on the client.

**Major components:**
1. Inventory and lease core — owns units, occupancy, tenants, and lease history
2. Billing and reminder engine — owns fee generation, due calculations, and alert snapshots
3. Repair and abnormality module — owns repair logs, categories, and abnormality detection
4. Import pipeline — owns spreadsheet onboarding with preview and validation

### Critical Pitfalls

1. **Wrong rentable-unit model** — avoid by committing to `asset -> room -> lease` from the start
2. **UI-only reminder logic** — avoid by storing and dispatching alerts through scheduled cloud functions
3. **Unsafe spreadsheet import** — avoid with parse -> validate -> preview -> commit
4. **Tenant history loss** — avoid by making lease lifecycle explicit and immutable
5. **Unstructured repair notes** — avoid by enforcing fixed categories plus remarks

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Core Data Foundation
**Rationale:** Everything else depends on the right inventory and lease model.
**Delivers:** Asset/room structure, tenant records, lease lifecycle, and current-status baseline.
**Addresses:** Inventory, tenant history, lease tracking.
**Avoids:** Wrong rentable-unit model and lost tenant history.

### Phase 2: Billing, Alerts, and Dashboard
**Rationale:** This delivers the core value of knowing what to collect and what is abnormal each day.
**Delivers:** Split billing, reminder rules, alert snapshots, and the home dashboard.
**Uses:** Cloud functions, date logic, WeChat subscription-message flow.
**Implements:** Billing and reminder architecture.

### Phase 3: Repairs and Import
**Rationale:** Once the core workflow is stable, onboarding data and maintenance intelligence become high leverage.
**Delivers:** Repair logging, frequency analytics, manual abnormality tagging, and Excel import.
**Avoids:** Unsafe import flow and unusable repair history.

### Phase 4: Stabilization and Extension Hooks
**Rationale:** Hardens v1 and prepares future recipient expansion without widening scope too early.
**Delivers:** Notification preference groundwork, audits, testing, and operational polish.

### Phase Ordering Rationale

- The room/lease model must come before billing and alerts.
- Billing and alerts must come before advice and dashboard summaries feel trustworthy.
- Import should land after schemas are stable enough to protect data quality.
- Repair analytics depend on both structured repairs and stable tenancy history.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2:** official reminder sending flow and operational constraints need concrete implementation checks
- **Phase 3:** spreadsheet import UX and validation edge cases need careful planning

Phases with standard patterns:
- **Phase 1:** entity modeling and CRUD are standard once the domain model is settled

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified against official WeChat docs, npm package metadata, and mature open-source libraries |
| Features | HIGH | Directly aligned with explicit user requirements and validated by adjacent open-source systems |
| Architecture | HIGH | Strong fit between operational workflow and CloudBase-style monolith |
| Pitfalls | HIGH | Mostly domain-structural and directly inferable from the requested workflow |

**Overall confidence:** HIGH

### Gaps to Address

- Official reminder dispatch details beyond client subscription consent should be checked again during Phase 2 planning
- Final import template design should be validated against your real spreadsheet habits once you begin populating data

## Sources

### Primary (HIGH confidence)
- https://developers.weixin.qq.com/miniprogram/dev/framework/
- https://developers.weixin.qq.com/miniprogram/dev/api/open-api/subscribe-message/wx.requestSubscribeMessage.html
- https://developers.weixin.qq.com/miniprogram/dev/wxcloudservice/wxcloud/basis/getting-started.html
- https://github.com/Tencent/tdesign-miniprogram
- https://docs.sheetjs.com

### Secondary (MEDIUM confidence)
- https://github.com/freeleepm/mini-contract
- https://github.com/java110/WechatOwnerService

### Tertiary (LOW confidence)
- GitHub repository metadata for `LiuXin-Developer/rightHouse` inspected on 2026-04-01

---
*Research completed: 2026-04-01*
*Ready for roadmap: yes*
