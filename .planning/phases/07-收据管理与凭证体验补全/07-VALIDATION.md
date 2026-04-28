---
phase: 07
slug: receipt-management-credential-experience
status: complete
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-28
---

# Phase 07 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest with `ts-jest` |
| **Config file** | `jest.config.cjs` |
| **Quick run command** | `npm test -- --runTestsByPath tests/cloud/receipt-create.spec.ts tests/cloud/receipt-delete.spec.ts tests/cloud/receipt-list.spec.ts tests/cloud/receipt-pdf.spec.ts tests/cloud/unit-detail-flow.spec.ts --runInBand` |
| **Full suite command** | `npm test -- --runInBand && npm run typecheck` |
| **Estimated runtime** | ~45 seconds targeted, ~90 seconds full suite |

---

## Sampling Rate

- **After every task commit:** Run the targeted `--runTestsByPath` command named in that task.
- **After every plan wave:** Run `npm test -- --runInBand && npm run typecheck`.
- **Before `$gsd-verify-work`:** Full suite and typecheck must be green.
- **Max feedback latency:** 90 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | RCPT-03, RCPT-04 | cloud unit | `npm test -- --runTestsByPath tests/cloud/receipt-list.spec.ts --runInBand` | no - Wave 0 | pending |
| 07-01-02 | 01 | 1 | RCPT-05, RCPT-06 | cloud unit | `npm test -- --runTestsByPath tests/cloud/receipt-create.spec.ts tests/cloud/receipt-delete.spec.ts --runInBand` | yes | complete |
| 07-02-01 | 02 | 2 | RCPT-03, RCPT-04 | static UI + typecheck | `npm test -- --runTestsByPath tests/cloud/unit-detail-flow.spec.ts tests/cloud/receipt-list.spec.ts --runInBand && npm run typecheck` | partial | pending |
| 07-02-02 | 02 | 2 | RCPT-04, RCPT-08 | static UI + cloud unit | `npm test -- --runTestsByPath tests/cloud/unit-detail-flow.spec.ts tests/cloud/receipt-list.spec.ts --runInBand` | partial | pending |
| 07-03-01 | 03 | 2 | RCPT-06 | cloud unit + static UI | `npm test -- --runTestsByPath tests/cloud/receipt-create.spec.ts tests/cloud/unit-detail-flow.spec.ts --runInBand` | partial | pending |
| 07-03-02 | 03 | 2 | RCPT-05 | cloud unit + static UI | `npm test -- --runTestsByPath tests/cloud/receipt-delete.spec.ts tests/cloud/unit-detail-flow.spec.ts --runInBand` | yes | complete |
| 07-04-01 | 04 | 3 | RCPT-07 | static UI + typecheck | `npm test -- --runTestsByPath tests/cloud/unit-detail-flow.spec.ts --runInBand && npm run typecheck` | partial | pending |
| 07-04-02 | 04 | 3 | RCPT-03, RCPT-04, RCPT-05, RCPT-06, RCPT-07, RCPT-08 | full regression | `npm test -- --runInBand && npm run typecheck` | yes | pending |

---

## Wave 0 Requirements

- [x] `tests/cloud/receipt-list.spec.ts` - covers `receipt-list` filters, snapshot rows and cross-landlord isolation.
- [ ] Extend `tests/cloud/receipt-create.spec.ts` - covers merged monthly receipt, same-room/same-tenant guard, and active receipt overlap guard via `receipts.billIds`.
- [x] `tests/cloud/receipt-delete.spec.ts` - covers deleting a receipt, unlinking bills, cross-landlord protection and reissue availability.
- [ ] Extend `tests/cloud/unit-detail-flow.spec.ts` - covers page registration, business maintenance entry, receipt records entry, formal receipt controls, and no visible internal ID labels.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| WeChat page sharing opens a receipt preview path | RCPT-07 | `onShareAppMessage` behavior is platform-driven | In WeChat DevTools, open a receipt, trigger share, confirm shared path is `/pages/receipt/index?receiptId=...` and title contains receipt number plus tenant name. |
| Clipboard save summary uses WeChat native prompt | RCPT-07 | `wx.setClipboardData` is platform UI | In WeChat DevTools, tap copy/save summary, confirm the copied text contains `收款收据（非发票）`, receipt number, tenant, total amount, and received date. |
| Album/image export if implemented | RCPT-07 | Album permission and canvas rendering require Mini Program runtime | Tap image save/share control, grant permission if prompted, confirm generated image is legible and no PDF dependency is introduced. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands or Wave 0 dependencies.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers all missing references.
- [x] No watch-mode flags.
- [x] Feedback latency target is under 90 seconds.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** complete
