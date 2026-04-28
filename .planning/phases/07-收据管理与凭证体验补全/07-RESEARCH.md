# Phase 07: 收据管理与凭证体验补全 - Research

**Researched:** 2026-04-28
**Domain:** WeChat Mini Program receipt management, CloudBase receipt queries, receipt preview/share UX
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- 收据只针对租客已收款项，不包含房东支出。
- 收据内容必须保存快照，不能动态读取当前账单重算。
- 作废不删除旧收据，不删除账单历史。
- 重开生成新收据，并通过 `reissueFromReceiptId` 关联旧收据。
- 已有关联有效收据的账单不得重复生成有效收据。
- 收据管理入口应放在业务维护，不放在首页。
- 房间详情仍保留“生成/查看收据”的上下文入口。

### Claude's Discretion

CONTEXT.md did not provide an explicit `## Claude's Discretion` section. The implementation approach is discretionary only within the documented "需要规划的能力" scope: receipt records page, merged receipt creation, void reason UX, save/share fallback, and formal receipt preview layout.

### Deferred Ideas (OUT OF SCOPE)

CONTEXT.md did not provide an explicit `## Deferred Ideas` section. PDF generation is explicitly not a blocker for first delivery: "第一版不要阻塞在 PDF 能力上。"
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RCPT-03 | 用户可以从业务维护进入收据记录管理页，按月份、房源、房间、租客和状态筛选收据 | Add `receipt-list` cloud function and `pages/receipt-records/index`; reuse report-export picker/list patterns. |
| RCPT-04 | 用户可以查看每张收据关联的账单、房源/房间、租客、收款日期、金额和作废/重开状态 | Existing receipt snapshot already stores `billIds`, names, `items`, `receivedAt`, `totalAmount`, `status`, `voidReason`, `reissueFromReceiptId`; list response should expose display rows from snapshot only. |
| RCPT-05 | 作废收据时必须填写作废原因，旧收据保留快照，新收据通过 `reissueFromReceiptId` 追溯来源 | Existing backend stores reason but UI currently hard-codes it; make reason required server-side and use a textarea dialog. |
| RCPT-06 | 支持按一个房间某个月的多笔已收租客账单合并生成一张收据，并防止重复生成有效收据 | Existing `receipt-create` supports `month + roomId`; strengthen same-room/same-tenant and active-overlap checks, and add UI selection/preview. |
| RCPT-07 | 收据预览具备正式凭证排版，可保存/分享；如 PDF/图片能力受小程序限制，先提供可落地的保存或分享方案 | Use page share + copy summary as baseline; use Mini Program canvas/image APIs for image export only if implementation fits the phase. Do not add PDF. |
| RCPT-08 | 收据入口在房间详情、业务维护和收据记录之间形成闭环，不暴露内部 ID | Add visible navigation labels and receipt numbers; internal IDs may be query params but never rendered as user-facing text. |
</phase_requirements>

## Summary

Phase 07 should extend the existing Phase 06 receipt primitives rather than replace them. `receipt-create`, `receipt-get`, `receipt-void`, shared `receiptSchema`, and `pages/receipt` already provide the core snapshot, view, void, and reissue behavior. The missing pieces are management/listing, real void reason input and validation, merged monthly receipt UI, stronger duplicate/mixed-bill guards, and a more formal preview/share surface.

The safest plan is to add one cloud function, `receipt-list`, plus one Mini Program page, `pages/receipt-records/index`, then upgrade the existing receipt page and unit detail entry. Keep data source of truth in `receipts`; list rows and previews must render the saved snapshot, not re-query current bills for display. Use current bills only before creating a new merged receipt.

**Primary recommendation:** Build a receipt management center around the saved receipt snapshot, with backend list/filter support and Mini Program-native share/copy/image fallback; do not introduce PDF generation or a new document service in this phase.

## Project Constraints (from CLAUDE.md)

- Deliver primarily as a WeChat Mini Program.
- First version serves one landlord account; all queries must remain scoped by `landlordOpenId`.
- Core model remains `asset -> room -> lease`; whole-rent mode is represented through the default whole-unit room.
- Page layer should call cloud functions through services, not operate collections directly.
- Do not expose internal IDs to users; use picker/search labels and receipt numbers in UI.
- UI should stay simple, functional, Chinese-language, black/white first; avoid high-design complexity.
- Prefer mature/open-source or official platform capabilities; avoid unnecessary custom infrastructure.
- Work should stay inside GSD artifacts; this research file is part of the planning workflow.

## Standard Stack

### Core

| Library / Platform | Project Version | Latest Verified | Purpose | Why Standard |
|--------------------|-----------------|-----------------|---------|--------------|
| WeChat Mini Program native APIs | current runtime | official docs via `miniprogram-api-typings` | Pages, pickers, canvas/share/clipboard APIs | Required delivery platform. |
| WeChat CloudBase cloud functions | `wx-server-sdk: latest` per function packages | platform-managed | Receipt list/create/get/void backend | Existing architecture and OPENID scoping. |
| TypeScript | package lock `5.8.3`; local installed `5.9.3`; latest `6.0.3` | 2026-04-16 | Shared schemas, cloud functions, page logic | Existing strict TS project. Do not upgrade for this phase. |
| Zod | package lock `4.3.6`; local installed `3.25.76`; latest `4.3.6` | 2026-01-22 | Receipt schema validation | Existing schema boundary pattern. Run `npm install` if dependency drift blocks work. |
| Day.js | `1.11.20` | 2026-03-12 | Month/date formatting | Existing date utility in billing/detail code. |
| Jest + ts-jest | lock `jest@30.0.5`, local `29.7.0`, latest `30.3.0`; `ts-jest@29.4.9` latest | 2026-03/04 | Unit/cloud-function tests | Existing test framework and mocks. |

### Supporting

| Library / API | Version | Purpose | When to Use |
|---------------|---------|---------|-------------|
| `miniprogram-api-typings` | lock `5.1.2`, local `4.1.3`, latest `5.1.3` | Typed Mini Program APIs | Use for `wx.showShareMenu`, `onShareAppMessage`, `wx.setClipboardData`, canvas/image APIs. |
| `wx.setClipboardData` | base library 1.1.0 | Copy receipt summary | Baseline "保存凭证摘要" fallback. |
| `wx.showShareMenu` + `onShareAppMessage` | base library 1.1.0 | Share receipt page | Baseline share implementation. |
| `wx.canvasToTempFilePath` + `wx.saveImageToPhotosAlbum` + `wx.showShareImageMenu` | canvas export 1.9.0; save image 1.2.0; image share menu 2.14.3 | Save/share receipt image | Use only if planning includes image rendering; still no PDF. |
| `tdesign-miniprogram` | lock `1.13.1`, latest `1.14.0` | Component library | Do not introduce in this phase unless already installed/needed; current pages use native/custom components. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Snapshot-based receipt list | Recompute from current bills | Violates locked decision; old receipts would drift after bill edits. |
| Native share/copy/image APIs | PDF generation | PDF adds rendering/storage complexity and is explicitly not required for first delivery. |
| Existing custom page styles | TDesign dialogs/forms | TDesign is declared but not currently installed locally or used in pages; adding it increases integration surface. |

**Installation / environment repair if needed:**
```bash
npm install
```

**Version verification:** `npm view` was run on 2026-04-28. Current latest packages: `tdesign-miniprogram@1.14.0`, `miniprogram-api-typings@5.1.3`, `typescript@6.0.3`, `dayjs@1.11.20`, `zod@4.3.6`, `jest@30.3.0`, `ts-jest@29.4.9`, `@cloudbase/wx-cloud-client-sdk@1.8.8`, `xlsx@0.18.5`. Recommendation is to stay with project lock/package versions for Phase 07 and avoid dependency churn.

## Architecture Patterns

### Recommended Project Structure

```text
cloudfunctions/
├── receipt-list/                 # new cloud function for records and filters
├── receipt-create/               # extend invariants for merged receipts
├── receipt-void/                 # require non-empty reason
└── shared/
    ├── schemas/receipt.ts        # optional list/filter helper fields if needed
    └── repositories/receipt-repository.ts

miniprogram/
├── pages/receipt-records/        # new management center
├── pages/receipt/                # formal preview + void reason + share/copy
├── pages/unit-detail/            # merged monthly receipt entry
└── services/receipt.ts           # add listReceiptRecords

tests/cloud/
├── receipt-list.spec.ts
├── receipt-create.spec.ts        # extend duplicate/mixed monthly cases
├── receipt-void.spec.ts          # require reason
└── unit-detail-flow.spec.ts      # static routing/copy assertions
```

### Pattern 1: Backend List Function Mirrors Export Records

**What:** Add `receipt-list` that calls `listReceipts(db, landlordOpenId, filters)` and returns `{ receipts, filters? }`.
**When to use:** Receipt records page loading and filtering.
**Example:**

```typescript
// Source: existing report-export-list pattern
export async function main(event: ReceiptListEvent = {}) {
  const db = resolveDb(event);
  const landlordOpenId = resolveLandlordOpenId(event);
  return {
    receipts: await listReceipts(db, landlordOpenId, event.filters ?? {})
  };
}
```

Implementation details:
- Always filter by `landlordOpenId`.
- Month filter should use bill due month from snapshot items (`item.dueDate.slice(0, 7)`) because merged receipts are defined by `month + roomId`. Display `receivedAt` separately.
- Status filter supports `all | active | voided`.
- Asset/room/tenant filters use snapshot `assetId`, `roomId`, `tenantId`, not current names.
- Sort newest first by `createdAt`, then `receiptNo`.

### Pattern 2: Snapshot Row View Model

**What:** Convert receipt snapshots into stable list rows.
**When to use:** Receipt management list cards and preview headers.
**Example:**

```typescript
// Source: local receipt schema fields
const row = {
  receiptNo: receipt.receiptNo,
  monthKey: receipt.items[0]?.dueDate.slice(0, 7) ?? '',
  locationLabel: `${receipt.assetName} / ${receipt.roomName}`,
  tenantName: receipt.tenantName,
  receivedAt: receipt.receivedAt,
  totalAmount: receipt.totalAmount,
  statusLabel: receipt.status === 'voided' ? '已作废' : '有效',
  reissueFromReceiptId: receipt.reissueFromReceiptId
};
```

Do not display `receipt.id`, `billIds`, `assetId`, `roomId`, or `tenantId`.

### Pattern 3: Required Void Reason

**What:** UI requires a typed reason; backend rejects empty/whitespace reasons.
**When to use:** `pages/receipt` void action and `receipt-void`.
**Example:**

```typescript
const reason = String(input.voidReason || '').trim();
if (!reason) {
  throw new Error('voidReason is required.');
}
```

Use an existing custom dialog style with `<textarea>` instead of `wx.showModal`; `wx.showModal` has no text input.

### Pattern 4: Merged Receipt Guard

**What:** Before receipt creation, verify all selected bills are paid tenant bills, same room, same tenant/lease, same due month, and have no overlapping active receipt.
**When to use:** `receipt-create` for both explicit `billIds` and `month + roomId`.
**Example:**

```typescript
const activeReceipts = receipts.filter((receipt) => receipt.status === 'active');
const activeBillIds = new Set(activeReceipts.flatMap((receipt) => receipt.billIds));
const duplicateBill = bills.find((bill) => activeBillIds.has(bill.id));
if (duplicateBill) {
  throw new Error(`Bill ${duplicateBill.id} already has an active receipt.`);
}
```

This is stronger than relying only on `bill.receiptId`, which can become stale if a prior write partially failed.

### Anti-Patterns to Avoid

- **Rendering old receipts from current bill state:** Breaks receipt snapshot semantics.
- **Only validating duplicate receipts through `bill.receiptId`:** Misses active receipt overlap if bill backrefs drift.
- **Combining different tenants in one receipt:** Existing repository would label the receipt from the first bill. Add same-tenant guard.
- **Using `wx.showModal` for void reason:** No text input; leads to hard-coded/default reasons.
- **Exposing raw IDs in labels:** Use receipt number and human labels only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF receipt export | Custom PDF renderer or server-side document service | Mini Program page share/copy first; optional canvas image export | PDF is out of first-delivery scope and adds storage/rendering QA. |
| Receipt source of truth | Dynamic bill recomputation | `receipts` snapshot collection | Required by RCPT-02 and Phase 07 decisions. |
| Share/copy primitives | Custom share bridge | `onShareAppMessage`, `wx.showShareMenu`, `wx.setClipboardData` | Official Mini Program APIs are available and typed. |
| Filtering UI from raw IDs | Text inputs for asset/room IDs | Existing picker pattern from report export page | Avoids exposing internal IDs and prevents invalid filters. |
| Date/month parsing | Manual substring everywhere in UI | Repository helper + Day.js formatting | Keeps month semantics consistent. |

**Key insight:** The hard part is not rendering a pretty receipt; it is preserving legal-ish snapshot semantics and preventing duplicate/mixed receipts after void/reissue. Plan backend invariants before page polish.

## Common Pitfalls

### Pitfall 1: Month Ambiguity

**What goes wrong:** List filter uses receipt creation month while merged create uses bill due month.
**Why it happens:** Existing `receipt-create(month + roomId)` selects by `bill.dueDate`.
**How to avoid:** Define Phase 07 "月份" as bill due month for receipt records; display receipt `receivedAt` separately.
**Warning signs:** A late-paid April bill received in May disappears from the April receipt list.

### Pitfall 2: Mixed Tenant Monthly Receipt

**What goes wrong:** A room with tenant turnover in the same month gets one receipt labeled with the first tenant only.
**Why it happens:** Existing create logic resolves tenant from the first bill.
**How to avoid:** Require all selected bills to share the same `leaseId` / `tenantId`; otherwise show separate candidate groups.
**Warning signs:** Receipt list row tenant does not match some included bill history.

### Pitfall 3: Void Does Not Free Bill Correctly

**What goes wrong:** A voided receipt still leaves `bill.receiptId` pointing to the old receipt and blocks reissue, or an active overlap slips through.
**Why it happens:** Backrefs and receipt snapshots are two sources for duplicate detection.
**How to avoid:** Treat active `receipts.billIds` as authoritative for duplicate detection; reissue updates bill backrefs to the new active receipt.
**Warning signs:** Reissue fails with "already has active receipt" after void, or duplicate active receipts exist for one bill.

### Pitfall 4: Save/Share Overreach

**What goes wrong:** Phase stalls on PDF or pixel-perfect image rendering.
**Why it happens:** Mini Program pages cannot be trivially saved as PDF; canvas image export requires separate drawing logic.
**How to avoid:** Deliver page share and copy summary first; add canvas image only as an incremental task with fallback.
**Warning signs:** Planner adds a server PDF library or cloud file pipeline before list/void/merge behavior is done.

## Code Examples

### Existing Receipt Snapshot Fields

```typescript
// Source: cloudfunctions/shared/schemas/receipt.ts
export const receiptSchema = z.object({
  id: z.string(),
  receiptNo: z.string(),
  landlordOpenId: z.string(),
  leaseId: z.string(),
  roomId: z.string(),
  tenantId: z.string(),
  assetId: z.string(),
  billIds: z.array(z.string()),
  title: z.literal('收款收据（非发票）'),
  assetName: z.string(),
  roomName: z.string(),
  tenantName: z.string(),
  items: z.array(receiptItemSchema),
  totalAmount: z.number().nonnegative(),
  receivedAt: z.string(),
  status: z.enum(['active', 'voided']).default('active'),
  voidReason: z.string().nullable().default(null),
  reissueFromReceiptId: z.string().nullable().default(null)
});
```

### Existing Picker/List Pattern to Reuse

```typescript
// Source: miniprogram/pages/report-export/index.ts
const assets = await listAssets() as Array<Record<string, any>>;
this.setData({
  assets,
  assetOptions: assets.map((asset) => String(asset.name || '未命名房源'))
});
```

### Native Share/Copy Baseline

```typescript
// Source: WeChat Mini Program API surface from miniprogram-api-typings
onShareAppMessage() {
  return {
    title: `${this.data.receipt?.receiptNo || '收款收据'} ${this.data.receipt?.tenantName || ''}`,
    path: `/pages/receipt/index?receiptId=${this.data.receiptId}`
  };
}

wx.setClipboardData({
  data: buildReceiptSummary(this.data.receipt)
});
```

## State of the Art

| Old Approach | Current Approach | When Changed / Verified | Impact |
|--------------|------------------|--------------------------|--------|
| Treat receipt as one bill action in room detail | Receipt management center with list/filter/status actions | Phase 07 scope, 2026-04-28 | Requires `receipt-list` and business maintenance entry. |
| Hard-coded void reason from page | Required user-entered reason | Phase 07 RCPT-05 | Backend and UI must both validate. |
| One paid bill -> one receipt UI | One room/month can merge multiple paid tenant bills | Backend partially exists from Phase 06 | Need grouped candidates and duplicate protection. |
| PDF as "formal" output | Native page share/copy/image fallback | WeChat API audit, 2026-04-28 | Avoids server PDF dependency. |

**Deprecated/outdated:**
- Hard-coded `voidReason: '用户作废重开'` in `pages/receipt`: replace with required textarea input.
- List filtering by text-entered IDs: use pickers/search labels.
- Relying on package declarations without installed dependency check: local `node_modules` is stale; use `npm install` before dependency-sensitive work.

## Open Questions

1. **Should image export be mandatory in Phase 07 or accepted as fallback?**
   - What we know: Official APIs support canvas-to-image, saving to album, and image share menu.
   - What's unclear: Whether the implementation budget should include a separate canvas renderer for formal receipt layout.
   - Recommendation: Plan baseline share page + copy summary as required, and make canvas image export an optional task only after backend/list/void/merge pass.

2. **Should receipt list month filter also support received month?**
   - What we know: Merged receipt creation uses bill due month.
   - What's unclear: User may expect "收款日期月份" in some workflows.
   - Recommendation: First implement due-month filter to match merge semantics; list rows show `receivedAt` so a future received-month filter can be added without data migration.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | tests/build scripts | yes | `v24.14.1` | Use project scripts as-is; cloud runtime remains Node-compatible TS/CommonJS. |
| npm | dependency repair/version audit | yes | `11.11.0` | none needed. |
| Local Jest binary | automated tests | yes | local `29.7.0`, package lock `30.0.5` | Existing receipt tests pass; run `npm install` to restore lock if needed. |
| TypeScript compiler | typecheck | yes | local `5.9.3`, package lock `5.8.3` | `npm run typecheck` passes currently. |
| WeChat DevTools | Mini Program manual QA/cloud upload | yes | `/Applications/wechatwebdevtools.app` | Manual validation in DevTools. |
| `tdesign-miniprogram` local install | optional UI components | no | package lock `1.13.1` | Use existing native/custom UI; no blocker. |
| `xlsx` local install | report export only | no | package lock `0.18.5` | Not required for Phase 07 unless touching export. |

**Missing dependencies with no fallback:**
- None for Phase 07 planning.

**Missing dependencies with fallback:**
- `tdesign-miniprogram`, `@cloudbase/wx-cloud-client-sdk`, `xlsx`, and declared versions for several packages are not fully installed in local `node_modules`; existing receipt tests and typecheck still pass. Planner should include `npm install` only if implementation hits dependency drift.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest with `ts-jest` |
| Config file | `jest.config.cjs` |
| Quick run command | `npm test -- --runTestsByPath tests/cloud/receipt-create.spec.ts tests/cloud/receipt-void.spec.ts tests/cloud/receipt-list.spec.ts tests/cloud/unit-detail-flow.spec.ts --runInBand` |
| Full suite command | `npm test -- --runInBand && npm run typecheck` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| RCPT-03 | Receipt records entry and filters | cloud unit + static UI | `npm test -- --runTestsByPath tests/cloud/receipt-list.spec.ts tests/cloud/unit-detail-flow.spec.ts --runInBand` | no - Wave 0 |
| RCPT-04 | List/preview rows show snapshot-linked bills and status | cloud unit | `npm test -- --runTestsByPath tests/cloud/receipt-list.spec.ts --runInBand` | no - Wave 0 |
| RCPT-05 | Void requires reason and preserves snapshot | cloud unit + static UI | `npm test -- --runTestsByPath tests/cloud/receipt-void.spec.ts tests/cloud/unit-detail-flow.spec.ts --runInBand` | partial |
| RCPT-06 | Merged monthly receipt prevents active duplicates | cloud unit | `npm test -- --runTestsByPath tests/cloud/receipt-create.spec.ts --runInBand` | partial |
| RCPT-07 | Preview has formal receipt text and save/share fallback controls | static UI | `npm test -- --runTestsByPath tests/cloud/unit-detail-flow.spec.ts --runInBand` | partial |
| RCPT-08 | Navigation loop across unit detail, ops, receipt records, preview | static UI | `npm test -- --runTestsByPath tests/cloud/unit-detail-flow.spec.ts --runInBand` | partial |

### Sampling Rate

- **Per task commit:** run the targeted `--runTestsByPath` command for touched receipt/list/UI tests.
- **Per wave merge:** `npm test -- --runInBand && npm run typecheck`.
- **Phase gate:** full suite and typecheck green before `/gsd:verify-work`.

### Wave 0 Gaps

- [ ] `tests/cloud/receipt-list.spec.ts` - covers RCPT-03, RCPT-04 filters and snapshot rows.
- [ ] Extend `tests/cloud/receipt-create.spec.ts` - covers RCPT-06 merged monthly create, same-room/same-tenant guard, active overlap duplicate guard.
- [ ] Extend `tests/cloud/receipt-void.spec.ts` - covers RCPT-05 required non-empty reason.
- [ ] Extend `tests/cloud/unit-detail-flow.spec.ts` - covers ops entry, receipt records page registration, formal preview controls, and no visible internal ID labels.

## Sources

### Primary (HIGH confidence)

- `cloudfunctions/shared/schemas/receipt.ts` - current receipt snapshot contract.
- `cloudfunctions/shared/repositories/receipt-repository.ts` - current create/get/void behavior and existing `month + roomId` support.
- `miniprogram/pages/receipt/index.ts|wxml|wxss` - current preview, void, reissue UI.
- `miniprogram/pages/report-export/index.ts|wxml` - existing month/asset/room picker and record-list pattern.
- `cloudfunctions/shared/runtime.ts` - current `listAll`, `insertRecord`, `updateRecord`, missing-collection handling.
- `node_modules/miniprogram-api-typings/types/wx/*.d.ts` - official Mini Program API links and signatures for `canvasToTempFilePath`, `saveImageToPhotosAlbum`, `showShareImageMenu`, `showShareMenu`, `setClipboardData`, `openDocument`, `downloadFile`, `onShareAppMessage`.
- Official WeChat API URLs embedded in typings:
  - https://developers.weixin.qq.com/miniprogram/dev/api/canvas/wx.canvasToTempFilePath.html
  - https://developers.weixin.qq.com/miniprogram/dev/api/media/image/wx.saveImageToPhotosAlbum.html
  - https://developers.weixin.qq.com/miniprogram/dev/api/share/wx.showShareImageMenu.html
  - https://developers.weixin.qq.com/miniprogram/dev/api/share/wx.showShareMenu.html
  - https://developers.weixin.qq.com/miniprogram/dev/api/device/clipboard/wx.setClipboardData.html

### Secondary (MEDIUM confidence)

- `npm view` registry checks on 2026-04-28 for package latest versions and publish dates.
- `package.json` and `package-lock.json` for project-pinned dependency versions.
- Existing tests: `tests/cloud/receipt-create.spec.ts`, `tests/cloud/receipt-void.spec.ts`, `tests/cloud/unit-detail-flow.spec.ts`.

### Tertiary (LOW confidence)

- None. No unverified community sources were needed.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - based on current project files, lockfile, npm registry checks, and local environment audit.
- Architecture: HIGH - extends existing Phase 06 receipt functions and report export page patterns.
- Pitfalls: HIGH - derived from current code gaps and existing receipt tests.
- Save/share approach: MEDIUM - official APIs are verified, but canvas image rendering effort should be validated during planning if made mandatory.

**Research date:** 2026-04-28
**Valid until:** 2026-05-05 for WeChat API/save-share assumptions; 2026-05-28 for local architecture patterns.
