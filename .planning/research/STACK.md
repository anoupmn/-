# Stack Research

**Domain:** Personal landlord rent-collection WeChat Mini Program
**Researched:** 2026-04-01
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| WeChat Mini Program native framework | latest official runtime | Primary client delivery | This project is explicitly a personal-use WeChat Mini Program, so native delivery keeps access to login, subscription messages, and official ecosystem capabilities first-class. |
| WeChat CloudBase / cloud development | official cloud service | Backend, database, cloud functions, scheduled jobs | For a single-user operational tool, CloudBase minimizes backend setup while staying inside the WeChat ecosystem needed for reminders and secure user identity. |
| TypeScript | 5.x | Typed app logic for mini program and cloud functions | Strong typing matters here because rent rules, reminder rules, fee items, and historical tenant records have many edge cases and will evolve. |
| Node.js | 20 LTS | Cloud function runtime and tooling | Mature runtime, broad library compatibility, and straightforward fit with CloudBase and spreadsheet processing. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `tdesign-miniprogram` | 1.13.1 | WeChat Mini Program component library | Use for functional first-pass UI such as cards, forms, tabs, badges, dialogs, and lists without spending time hand-building base components. |
| `@cloudbase/wx-cloud-client-sdk` | 1.8.6 | CloudBase client SDK | Use if the chosen app structure needs richer client-side cloud access patterns beyond the minimal built-in setup. |
| `miniprogram-api-typings` | 5.1.2 | Type definitions for WeChat APIs | Use from day one so subscription message APIs, storage APIs, and lifecycle methods stay typed. |
| `dayjs` | 1.11.20 | Date calculations | Use for due-date windows, overdue checks, vacancy duration, and contract reminders. |
| `zod` | 4.3.6 | Schema validation | Use at data import and cloud-function boundaries to validate Excel rows, reminder rules, and fee payloads. |
| `xlsx` | 0.18.5 | Excel import/export parsing | Use for initial migration and later bulk updates when importing houses, rooms, tenants, leases, and bills. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| WeChat DevTools | Mini Program development and preview | Required for native debugging, cloud environment linking, and subscription-message verification. |
| ESLint + Prettier | Code quality and formatting | Keep data-model and cloud-function code consistent as the schema grows. |
| Jest | Unit testing | Good fit for reminder rule calculation, billing generation, and import validation logic. |

## Installation

```bash
# Core
npm install typescript dayjs zod xlsx

# UI and platform support
npm install tdesign-miniprogram @cloudbase/wx-cloud-client-sdk miniprogram-api-typings

# Dev dependencies
npm install -D eslint prettier jest @types/jest
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Native Mini Program + CloudBase | `uni-app` or `Taro` | Use only if future scope clearly expands to multi-end delivery beyond WeChat. |
| `tdesign-miniprogram` | ThorUI | ThorUI is viable if you want a broader ready-made visual sample set; TDesign is cleaner for a restrained black-on-white first release. |
| `xlsx` | Custom CSV-only import | Use CSV-only only if Excel formatting proves too heavy and import scope is intentionally reduced. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Building all base components from scratch | Slows delivery and increases QA surface without adding business value | `tdesign-miniprogram` |
| Multi-service backend at v1 | Too much operational overhead for a single-user product | CloudBase monolith with cloud functions |
| Free-form unvalidated import payloads | High risk of bad due dates, billing drift, and broken tenant history | `zod`-validated import pipeline |

## Stack Patterns by Variant

**If reminder rules stay mostly deterministic:**
- Use scheduled cloud functions plus stored reminder rules
- Because rent due, overdue, vacancy, and repair frequency checks are rule-driven rather than AI-first

**If family/co-manager reminders are added later:**
- Extend the notification-recipient layer without changing the lease/billing core
- Because recipients are an output concern, not a billing-domain concern

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `tdesign-miniprogram@1.13.1` | Native WeChat Mini Program runtime | Official component library for Mini Program usage |
| `miniprogram-api-typings@5.1.2` | TypeScript 5.x | Keeps Mini Program APIs typed in editor and CI |
| `xlsx@0.18.5` | Node.js 20 LTS | Suitable for cloud-function-side import parsing |

## Sources

- https://developers.weixin.qq.com/miniprogram/dev/framework/ — verified native Mini Program framework path
- https://developers.weixin.qq.com/miniprogram/dev/api/open-api/subscribe-message/wx.requestSubscribeMessage.html — verified official subscription-message entry point
- https://developers.weixin.qq.com/miniprogram/dev/wxcloudservice/wxcloud/basis/getting-started.html — verified CloudBase path and capability categories
- https://github.com/Tencent/tdesign-miniprogram — verified Mini Program UI library and npm install path
- https://docs.sheetjs.com — verified Excel parsing library documentation
- `npm view` on 2026-04-01 for `tdesign-miniprogram`, `@cloudbase/wx-cloud-client-sdk`, `miniprogram-api-typings`, `dayjs`, `zod`, `xlsx`

---
*Stack research for: Personal landlord rent-collection WeChat Mini Program*
*Researched: 2026-04-01*
