---
phase: 03
slug: 首页概览与提醒引擎
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-03
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 30.x |
| **Config file** | `package.json` |
| **Quick run command** | `npm run typecheck` |
| **Full suite command** | `npm test -- --runInBand` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run typecheck`
- **After every plan wave:** Run `npm test -- --runInBand`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | DASH-01, DASH-02, DASH-03, ALRT-01, ALRT-02, ALRT-03, ALRT-04, ALRT-05 | unit + cloud | `npm test -- --runInBand --runTestsByPath tests/domain/alert-evaluator.spec.ts tests/cloud/dashboard-home.spec.ts tests/cloud/alerts-list.spec.ts tests/cloud/manual-abnormal.spec.ts` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | DASH-04, ALRT-05 | static + typecheck | `npm run typecheck` | ✅ | ⬜ pending |
| 03-03-01 | 03 | 3 | NOTF-01, NOTF-03 | cloud + typecheck | `npm test -- --runInBand --runTestsByPath tests/cloud/notification-preferences.spec.ts && npm run typecheck` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/domain/alert-evaluator.spec.ts` — lock alert classification and recommendation priority
- [ ] `tests/cloud/dashboard-home.spec.ts` — lock home aggregate payload
- [ ] `tests/cloud/alerts-list.spec.ts` — lock reminder grouping and filters
- [ ] `tests/cloud/manual-abnormal.spec.ts` — lock manual abnormal save/clear behavior
- [ ] `tests/cloud/notification-preferences.spec.ts` — lock consent/preference persistence

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Mini Program subscription prompt appears and returns consent result | NOTF-01 | Depends on `wx.requestSubscribeMessage` client behavior in WeChat runtime | Open dashboard or reminder settings, trigger “开启提醒”, confirm native prompt appears, then re-open settings and verify consent state text updates |
| Home first-screen scan order matches UI-SPEC | DASH-01, DASH-02, DASH-03, ALRT-05 | Visual hierarchy cannot be fully asserted in Jest | Open `workbench`, verify first screen shows overview cards first, abnormal list second, single recommendation third |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-03
