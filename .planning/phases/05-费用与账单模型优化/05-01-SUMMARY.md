---
phase: 05-费用与账单模型优化
plan: 05-01
subsystem: cloudfunctions
tags: [billing, alerts, runtime, cloudbase, tests]
requires:
  - phase: 02-账单与房态视图
    provides: bills collection, lease billing sync, unit detail billing display
  - phase: 03-首页概览与提醒引擎
    provides: alerts collection and dashboard rebuild flow
provides:
  - Business-id based runtime lookup and update helpers
  - Scoped alert rebuild by landlordOpenId
  - Safe lease bill resync that preserves paid bills and manual bills
  - Read-side guard for unit detail and unit list bill write boundaries
affects: [phase-05, phase-06, bills, alerts, leases, receipts, exports]
tech-stack:
  added: []
  patterns: [business-id repository writes, scoped derived collection rebuild, replaceable system bill guard]
key-files:
  created:
    - .planning/phases/05-费用与账单模型优化/05-01-SUMMARY.md
  modified:
    - cloudfunctions/shared/runtime.ts
    - cloudfunctions/shared/repositories/alert-repository.ts
    - cloudfunctions/shared/repositories/bill-repository.ts
    - tests/helpers/mock-cloud.ts
    - tests/cloud/bills-sync.spec.ts
    - tests/cloud/leases-save-billing.spec.ts
    - tests/cloud/dashboard-home.spec.ts
    - tests/cloud/alerts-list.spec.ts
    - tsconfig.json
key-decisions:
  - "Repository helpers now use business id through where({ id }) instead of assuming doc(id) maps to business id."
  - "Alert rebuild deletes only alerts for landlords present in the current rebuild input."
  - "Lease bill sync treats only unpaid, unreceipted system bills as replaceable."
requirements-completed: [CORR-01]
duration: 35 min
completed: 2026-04-28
---

# Phase 05 Plan 01: 数据集合职责、操作写入边界与账单同步安全治理 Summary

**Business-id-safe runtime writes, landlord-scoped alert rebuilds, and protected lease bill resync for paid/manual bill history.**

## Performance

- **Duration:** 35 min
- **Started:** 2026-04-28T00:19:14Z
- **Completed:** 2026-04-28T00:54:00Z
- **Tasks:** 3
- **Files modified:** 108

## Accomplishments

- Added regression tests proving lease resync preserves paid bills and manual bills.
- Changed runtime lookup/update helpers to use business `id`, with mock coverage for `_id !== id`.
- Rebuilt alerts by `landlordOpenId` scope instead of clearing the global `alerts` collection.
- Changed `syncBillsForLease` to delete only unpaid system-generated bills and keep paid/manual bill history.
- Synchronized affected shared files into cloud function deployment copies so tests and deployable functions use the same contract.

## Task Commits

1. **Task 1: 补齐写入边界 Wave 0 测试** - `c2fa600` (test)
2. **Task 2/3: 修正 runtime/alerts 边界并改造 syncBillsForLease** - `7e87e2a` (fix)

## Files Created/Modified

- `tests/helpers/mock-cloud.ts` - Mock database now distinguishes database `_id` from business `id`.
- `tests/cloud/bills-sync.spec.ts` - Covers paid/manual bill preservation during lease resync.
- `tests/cloud/leases-save-billing.spec.ts` - Covers the `leases-save` entrypoint preserving paid/manual bills.
- `tests/cloud/dashboard-home.spec.ts` - Covers alert rebuild preserving another landlord's alert.
- `tests/cloud/alerts-list.spec.ts` - Covers alert list rebuild preserving another landlord's alert.
- `cloudfunctions/shared/runtime.ts` - Uses business id reads/writes and adds scoped remove helper.
- `cloudfunctions/shared/repositories/alert-repository.ts` - Rebuilds alerts only for scoped landlords.
- `cloudfunctions/shared/repositories/bill-repository.ts` - Adds `isReplaceableSystemBill` and safe bill replacement.
- `cloudfunctions/*/shared/*` - Deployment shared copies synchronized for runtime, alerts, and billing contracts.
- `tsconfig.json` - Excludes local `* 2.ts` duplicate backup files from typecheck.

## Decisions Made

- Used `where({ id })` for runtime `findById` and `updateRecord` because business identifiers are the stable domain contract.
- Kept `clearCollection` for existing callers, but introduced scoped removal for derived collections that must be landlord-isolated.
- Preserved all paid bills, manual bills, receipted bills, and voided bills during lease resync; only unpaid system bills are replaceable.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Synchronized cloud function shared deployment copies**
- **Found during:** Task 2/3 verification.
- **Issue:** Cloud function tests import each function's local `shared` copy, not only `cloudfunctions/shared`.
- **Fix:** Synchronized runtime, alert repository, and bill repository changes into all existing cloud function shared copies.
- **Files modified:** `cloudfunctions/*/shared/runtime.*`, `cloudfunctions/*/shared/repositories/alert-repository.*`, `cloudfunctions/*/shared/repositories/bill-repository.*`
- **Verification:** `npm test -- --runTestsByPath tests/cloud/bills-sync.spec.ts tests/cloud/leases-save-billing.spec.ts tests/cloud/dashboard-home.spec.ts tests/cloud/alerts-list.spec.ts --runInBand`
- **Committed in:** `7e87e2a`

**2. [Rule 3 - Blocking] Excluded local duplicate TypeScript backup files from typecheck**
- **Found during:** Plan verification.
- **Issue:** Untracked files named `index 2.ts` were included by `tsconfig.json` and caused `npm run typecheck` to fail outside the plan scope.
- **Fix:** Added `exclude: ["**/* 2.ts"]` while keeping normal source globs intact.
- **Files modified:** `tsconfig.json`
- **Verification:** `npm run typecheck`
- **Committed in:** `7e87e2a`

---

**Total deviations:** 2 auto-fixed (2 blocking).
**Impact on plan:** Both fixes were necessary to verify the intended runtime behavior in this repository layout. No product scope was added.

## Issues Encountered

- `npm run typecheck` initially failed because untracked local duplicate `* 2.ts` files were compiled. Fixed via a narrow `tsconfig.exclude`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 05-02 can now build on a safer bill sync contract: paid/manual history is retained, alert rebuild is landlord-scoped, and repository helpers no longer assume `_id === id`.

---
*Phase: 05-费用与账单模型优化*
*Completed: 2026-04-28*
