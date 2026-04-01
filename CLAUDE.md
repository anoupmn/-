<!-- GSD:project-start source:PROJECT.md -->
## Project

**收租吧**

收租吧是一个面向个人房东自用的微信小程序，用来管理大约 80 间房屋与房间的收租、租户、费用和异常状态。它的核心是让房东每天打开首页就能快速知道哪些房间快到期、哪些已经逾期、哪些空置过久、哪些存在维修或人工标记异常，并通过微信官方可用的提醒能力接收待办提醒。

**Core Value:** 让我每天打开小程序就能立刻知道该收谁的租、哪间房有异常、下一步该处理什么。

### Constraints

- **Platform**: 必须以微信小程序为主要交付形态 — 用户日常使用入口已经明确
- **Audience**: 第一版只服务单一房东账号 — 先把个人使用体验做扎实，再考虑多人提醒
- **Data Model**: 必须兼容“房源/资产 -> 房间 -> 租约”层级结构 — 同时适配整租和分租
- **Notifications**: 提醒能力必须基于微信官方可用通道实现 — 关系到可上线和长期稳定性
- **UX**: 第一版采用黑字白底、功能优先的朴素风格 — 暂不把设计复杂度引入首轮开发
- **Implementation**: 优先采用成熟开源方案和官方能力 — 降低试错成本，避免重复造轮子
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

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
# Core
# UI and platform support
# Dev dependencies
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
- Use scheduled cloud functions plus stored reminder rules
- Because rent due, overdue, vacancy, and repair frequency checks are rule-driven rather than AI-first
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
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
