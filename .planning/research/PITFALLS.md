# Pitfalls Research

**Domain:** Personal landlord rent-collection WeChat Mini Program
**Researched:** 2026-04-01
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Modeling “house” as the only rentable unit

**What goes wrong:**
Whole-unit rentals and room-by-room rentals become inconsistent, forcing hacks and broken reminders.

**Why it happens:**
Teams optimize for the simplest demo schema instead of the real inventory model.

**How to avoid:**
Adopt `asset -> room -> lease` from the start, with whole-unit rental represented as either a direct rentable asset or a single effective room pattern.

**Warning signs:**
You find yourself using remarks or fake room names to express actual structure.

**Phase to address:**
Phase 1

---

### Pitfall 2: Computing reminders only in the UI

**What goes wrong:**
The home page may look right in manual testing, but actual reminder delivery is unreliable and not auditable.

**Why it happens:**
Reminder logic is easy to prototype in page code and hard to operationalize later.

**How to avoid:**
Move due/overdue/vacancy/repair rule evaluation into scheduled cloud functions and store generated alert records.

**Warning signs:**
Dashboard state and sent reminders disagree, or reminders only appear when the app is opened.

**Phase to address:**
Phase 2

---

### Pitfall 3: Importing Excel rows directly into production collections

**What goes wrong:**
Bad dates, duplicate rooms, and malformed billing cycles poison the entire dataset.

**Why it happens:**
Bulk import feels like a shortcut during onboarding.

**How to avoid:**
Use staged validation with schema checks, preview diffs, and idempotent commit steps.

**Warning signs:**
You need to “fix after import” manually more than once.

**Phase to address:**
Phase 3

---

### Pitfall 4: Losing tenant history on turnover

**What goes wrong:**
You can no longer answer who lived there before, what repairs happened under each tenant, or why vacancy time is broken.

**Why it happens:**
Current tenant fields get overwritten instead of closed into lease history.

**How to avoid:**
Make lease closure and new-lease creation explicit lifecycle actions, never destructive overwrites.

**Warning signs:**
Historical repairs no longer map cleanly to a tenant period.

**Phase to address:**
Phase 1

---

### Pitfall 5: Treating all repairs as generic notes

**What goes wrong:**
You cannot measure frequent issue types or detect abnormal repair frequency.

**Why it happens:**
Free-text notes are faster at first.

**How to avoid:**
Require fixed categories plus optional remarks and map repairs to house, room, and active lease where relevant.

**Warning signs:**
You can read repair history but cannot summarize it.

**Phase to address:**
Phase 2

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| One big “record” collection for everything | Faster initial CRUD | Queries, indexes, and history become messy quickly | Never |
| Free-form reminder rules stored as strings | Easy prototyping | Hard to validate and migrate | Only for throwaway prototypes, not this project |
| CSV-only import without validation | Faster to demo | High data cleanup cost | Only if import is temporary and manually reviewed |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| WeChat subscription messages | Assuming backend can message users without explicit client-side subscription consent | Build the consent capture flow in-app and persist subscription state |
| Cloud functions | Putting all domain logic in page code and only using cloud functions as thin proxies | Keep scheduling, validation, and reminder evaluation in cloud functions |
| Excel import | Parsing on the client and trusting the payload | Parse and validate on the server side before commit |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Full-scan dashboard queries | Home page gets slower as bills and repairs accumulate | Precompute dashboard summaries and recent alert windows | Usually after a few thousand records |
| Recomputing all reminder rules on every open | UI lag and inconsistent results | Scheduled evaluation with stored alert snapshots | Breaks quickly once history grows |
| Large import in one transaction | Timeouts or partial writes | Batch import with preview and chunked commit | Breaks on larger workbook uploads |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing unrestricted personal data with weak access assumptions | Privacy exposure | Keep single-user scope explicit and lock collections / functions to authorized user context |
| Allowing import files to overwrite identity links blindly | Broken ownership and history | Validate ownership and referential integrity during import |
| Sending reminders without audit records | Hard to prove what was notified | Store reminder generation and send history |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Dashboard shows counts but no next actions | User still has to hunt for work | Every summary card should drill into an actionable list |
| House detail buries current status under history | Slows daily management | Put current tenancy, next due date, abnormality, and repair summary first |
| Overloading first version with analytics views | Slows core workflow | Keep analytics secondary to daily operational tasks |

## "Looks Done But Isn't" Checklist

- [ ] **Reminder feature:** often missing client-side subscription consent flow — verify end-to-end send path
- [ ] **Tenant history:** often missing proper lease closure — verify turnover preserves previous tenant records
- [ ] **Repair analytics:** often missing tenancy linkage — verify each repair can map to a house and tenant period
- [ ] **Excel import:** often missing duplicate detection — verify idempotent or guided merge behavior

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Wrong asset/room model | HIGH | Freeze writes, migrate structure, remap leases and alerts |
| Broken import data | MEDIUM | Roll back import batch, repair validation rules, re-import |
| Lost tenant history | HIGH | Reconstruct from backup/import source where possible, then enforce lifecycle rules |
| Bad reminder logic | MEDIUM | Rebuild alert snapshots from normalized leases and bills |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Wrong rentable-unit model | Phase 1 | Whole-unit and room-rent examples both work cleanly |
| UI-only reminders | Phase 2 | Scheduled jobs generate and persist alerts |
| Unsafe import flow | Phase 3 | Import preview catches malformed rows before commit |
| Lost tenant history | Phase 1 | Tenant turnover leaves readable prior lease history |
| Unstructured repairs | Phase 2 | Repair categories support summary statistics |

## Sources

- https://developers.weixin.qq.com/miniprogram/dev/api/open-api/subscribe-message/wx.requestSubscribeMessage.html
- https://developers.weixin.qq.com/miniprogram/dev/wxcloudservice/wxcloud/basis/getting-started.html
- https://github.com/freeleepm/mini-contract
- https://github.com/java110/WechatOwnerService
- Project-specific inference from user requirements gathered on 2026-04-01

---
*Pitfalls research for: Personal landlord rent-collection WeChat Mini Program*
*Researched: 2026-04-01*
