# Feature Research

**Domain:** Personal landlord rent-collection WeChat Mini Program
**Researched:** 2026-04-01
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| House / room inventory management | A landlord tool is unusable without a clear unit list | MEDIUM | Must support both whole-unit rental and sub-room rental under one asset. |
| Current lease and tenant tracking | Core daily operation depends on knowing who lives where and under what terms | MEDIUM | Lease period, rent cycle, deposit, and fee rules must be attached to each active tenancy. |
| Rent due / overdue reminders | This is the core reason the user wants the product | MEDIUM | Reminder windows should be configurable and produce daily actionable queues. |
| Vacancy tracking | Landlords need immediate visibility into idle units | LOW | Vacancy duration should drive alerts and home-page summary numbers. |
| Historical tenant records | The user explicitly wants per-room tenant history | MEDIUM | Must preserve chronology even after tenant changeover. |
| Repair log and status tracking | Repairs directly affect abnormality monitoring and house health | MEDIUM | Must support fixed repair categories plus notes. |
| Fee ledger by item | Split billing is essential for rent, deposit, water, electricity, property fees, and misc. | HIGH | Needed for imports, reminders, and future reconciliation. |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Rule-based operational suggestions | Turns raw alerts into next-step guidance | MEDIUM | Examples: rent due follow-up, long vacancy intervention, high repair frequency review. |
| Repair frequency analytics by house and by tenant tenure | Helps spot bad units, recurring issues, and problematic use patterns | MEDIUM | Strong fit for your stated “what mainly breaks and under whose tenancy” need. |
| Fast import bootstrap from Excel | Reduces the setup cost of entering ~80 units | MEDIUM | Important because first migration speed determines whether v1 becomes real usage. |
| Home dashboard tuned for landlord workflow | Gives a “what do I need to do today?” operational cockpit | LOW | More valuable than a generic BI dashboard. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Tenant-side self-service in v1 | Sounds complete | Doubles product surface and complicates permissions, messaging, and UX | Keep v1 landlord-only |
| AI-generated decisions on day one | Sounds smart | Hard to explain, hard to trust, and unnecessary before clean structured data exists | Start with deterministic rule suggestions |
| Multi-role permission matrix in v1 | Feels future-proof | Adds complexity before there are real multiple operators | Single-user account now, extensible notification recipients later |
| Highly customized visual design now | Feels productized | Delays delivery of the actual operational core | Use restrained functional UI first |

## Feature Dependencies

```text
Asset / room inventory
    └──requires──> lease model
                         └──requires──> billing rules
                                              └──requires──> reminder engine

Tenant history ──requires──> lease lifecycle

Repair analytics
    └──requires──> repair log
                         └──enhances──> abnormality detection

Excel import ──requires──> validated schemas
```

### Dependency Notes

- **Inventory requires lease model:** houses and rooms must exist before leases, billing, and reminders can be attached.
- **Tenant history requires lease lifecycle:** changeover events must close one lease and open the next cleanly.
- **Repair analytics requires repair log:** analytics are only meaningful if each repair record has category, date, and affected tenancy.
- **Excel import requires validated schemas:** otherwise imported due dates and billing items will corrupt the core data model.

## MVP Definition

### Launch With (v1)

- [ ] Asset / room structure supporting whole-rent and room-rent scenarios — essential for your real inventory
- [ ] Lease, tenant, and split-fee ledger management — essential to know what is due and why
- [ ] Home dashboard with due-in-15-days, vacancy count, and abnormality list — essential daily cockpit
- [ ] Reminder engine for due soon, overdue, long vacancy, repair abnormality, and manual flags — essential action trigger
- [ ] Repair records and frequency statistics — essential for the abnormality logic you requested
- [ ] Manual entry and Excel import — essential for onboarding ~80 units quickly

### Add After Validation (v1.x)

- [ ] Multi-recipient reminders for family or partners — add once personal reminder flow is stable
- [ ] More detailed financial reconciliation reports — add once daily collection workflow is proven
- [ ] Attachment support for contracts or receipts — add once base records are used consistently

### Future Consideration (v2+)

- [ ] Tenant-side interactions — defer because landlord-only is the current goal
- [ ] Advanced pricing or vacancy recommendations — defer until data volume is mature
- [ ] Rich BI and trend dashboards — defer until operational basics are trusted

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Asset / room inventory | HIGH | MEDIUM | P1 |
| Lease + tenant management | HIGH | MEDIUM | P1 |
| Split fee ledger | HIGH | HIGH | P1 |
| Reminder engine | HIGH | MEDIUM | P1 |
| Home dashboard | HIGH | LOW | P1 |
| Repair log + analytics | HIGH | MEDIUM | P1 |
| Excel import | HIGH | MEDIUM | P1 |
| Multi-recipient reminders | MEDIUM | MEDIUM | P2 |
| Attachments | MEDIUM | MEDIUM | P2 |
| Trend reports | MEDIUM | MEDIUM | P2 |

## Competitor Feature Analysis

| Feature | Competitor A | Competitor B | Our Approach |
|---------|--------------|--------------|--------------|
| Rent reminders | `mini-contract` emphasizes contract expiration and renewal reminders | `HC智慧家园` includes housing repair / owner workflows rather than focused rent operations | Make reminders the core workflow, not a side feature |
| Repair handling | `HC智慧家园` includes repair workflows in a community context | `rightHouse` describes landlord-tenant repair handling in a broader platform model | Keep repair tracking but scope it to personal landlord operations |
| Contract / lease lifecycle | `mini-contract` is strong on lifecycle and reminders but too broad for v1 | `rightHouse` is platform-oriented and heavier than needed | Reuse lifecycle ideas, not the platform scope |
| Mini Program UI foundation | `tdesign-miniprogram` provides a modern standard component base | ThorUI offers many demos but a noisier visual starting point | Use TDesign for the restrained first build |

## Sources

- https://github.com/Tencent/tdesign-miniprogram
- https://docs.sheetjs.com
- https://github.com/freeleepm/mini-contract
- https://github.com/java110/WechatOwnerService
- GitHub repository metadata for `LiuXin-Developer/rightHouse` inspected on 2026-04-01

---
*Feature research for: Personal landlord rent-collection WeChat Mini Program*
*Researched: 2026-04-01*
