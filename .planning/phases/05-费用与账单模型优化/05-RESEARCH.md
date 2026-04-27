# Phase 05: 费用与账单模型优化 - Research

**Researched:** 2026-04-27  
**Domain:** 微信小程序云开发、账单事实模型、租约费用规则、房东支出、数据写入边界  
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

以下内容逐字摘录自 `.planning/phases/05-费用与账单模型优化/5-CONTEXT.md` 的 `## 实现决策`。

#### 数据集合与写入边界
- **D-01：** 第 5 阶段必须先审计数据集合职责和各种操作对应的数据修改，发现读写冲突要优先修正。
- **D-02：** `bills` 只承载租客应收/实收账单；维修、保洁、打理、请人管理等房东支出不得写入 `bills`。
- **D-03：** 房东支出进入独立事实口径，推荐新增 `owner_expenses` 集合。
- **D-04：** `alerts` 是派生集合，可以重建，但必须按当前房东范围清理和写入，不能为一个用户打开首页清空全局提醒。
- **D-05：** `rentable-unit-detail` 和 `rentable-units-list` 等展示型读侧函数不得补写或重建账单。
- **D-06：** 业务读写优先通过业务 `id`，不得假设业务 `id` 与数据库 `_id` 一致；Phase 05 需要审计并修正 `findById/updateRecord` 相关风险。

#### 账单同步安全
- **D-07：** 编辑租约时不得按 `leaseId` 整批删除所有账单。
- **D-08：** `syncBillsForLease` 只能替换未收款的系统生成账单。
- **D-09：** 已收账单永远保留；手工补录账单永远保留，除非走明确删除/作废流程。
- **D-10：** 后续导出和收据依赖账单历史稳定，因此禁止“保存租约后悄悄抹掉旧账单”的行为。

#### 固定费用
- **D-11：** 租约固定内置费用为：租金、押金、管理费、消防押金、锁卡押金。
- **D-12：** 消防押金和锁卡押金是一次性押金类应收，进入账单、收据和导出。
- **D-13：** 消防押金和锁卡押金不参与逾期提醒，也不作为“下一笔租金”核心提示。
- **D-14：** 管理费默认是周期性费用，但允许在租约里改为一次性费用。

#### 自定义费用
- **D-15：** 自定义费用必须选择性质：周期性费用、一次性费用或押金类费用。
- **D-16：** 自定义费用性质需要进入账单事实，后续详情、收款、导出和收据不能靠 label 猜测。
- **D-17：** 押金类自定义费用进入账单/收据/导出，但不进入逾期提醒或下一笔租金核心提示。

#### 水电抄表
- **D-18：** 水电费从“手填金额”改为“上期抄数、本期抄数、单价”，由服务端计算用量和金额。
- **D-19：** 水电补录时默认带出同房间同类型上一笔账单的本期读数和单价，降低重复录入。
- **D-20：** 水电账单保留备注，便于记录特殊情况。
- **D-21：** 前端不得自行计算最终账单金额作为真相；服务端计算结果写入 `bills`。

#### 维修与房东支出
- **D-22：** 维修、灯具、墙面、厕所堵塞、保洁、打理、请人管理等费用均是房东经营支出，不进入租客应收账单。
- **D-23：** 维修/支出入口可以合并为“记录维修/支出”，内部用分类区分维修类、保洁/打理类和其他支出。
- **D-24：** 金额不必填；不填金额也可以留维修事实，填了金额才进入支出统计和月度导出。
- **D-25：** 只有真正维修类记录参与“问题房间/高频维修异常”分析。
- **D-26：** 保洁、打理、请人管理等支出不计入维修高频异常。
- **D-27：** 房东支出后续需要支持月度导出，按发生日期归月。

#### 退租与录错补救
- **D-28：** 房源、房间、租客基础信息录错允许直接编辑。
- **D-29：** 没有已收账单、没有收据、没有维修/支出关联的租约允许安全删除。
- **D-30：** 安全删除租约时级联删除该租约下未收款账单。
- **D-31：** 一旦租约产生已收账单、收据或维修/支出关联，则禁止硬删除，只能编辑、更正、结束或作废。
- **D-32：** 租期或金额录错且未收款时，优先允许直接编辑并重算未收款系统账单。
- **D-33：** 房间或租客选错且未收款时，第一版允许删除重建，不强行做复杂迁移。
- **D-34：** 退租走“结束租约”，保留历史租约、历史账单、历史维修/支出。
- **D-35：** 退租时如存在未收账单，需要提示处理：保留欠款、作废未收系统账单、或修改截止日期后重算。

#### 与 Phase 06 的数据合同
- **D-36：** 第 5 阶段要产出后续导出和收据可直接消费的账单行合同。
- **D-37：** 账单行合同至少需要表达费用类型、费用性质、责任方、是否押金类、是否一次性、是否系统生成、是否历史/legacy、水电读数和收款状态。
- **D-38：** 月度导出和收据不得重新推导账单分类，必须使用 Phase 05 产出的稳定字段。

### Claude's Discretion

- 新账单分类字段的具体命名
- `owner_expenses` 是否第一版拆独立 repository 或复用现有维修 repository 后再抽离
- 旧账单兼容字段的具体 fallback 规则
- 安全删除租约的按钮位置、提示文案和二次确认样式
- 水电抄表表单的具体视觉布局

### Deferred Ideas (OUT OF SCOPE)

- 月度导出和收据生成 — 第 6 阶段
- Excel 批量导入 — 已从当前路线删除
- 微信官方提醒消息实际发送闭环 — 已从当前路线删除
- 维修照片/附件上传 — 未来附件能力
- 租客端报修或租客自助 — 未来租客侧能力
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FEE-01 | 租约录入固定内置费用：租金、押金、管理费、消防押金、锁卡押金 | 扩展 `LeaseFeeRules` 和账单生成合同；保留旧 `rentAmount/depositAmount` 兼容入口。 |
| FEE-02 | 消防押金和锁卡押金作为一次性押金类应收，进入账单、收据和导出，但不进入逾期提醒或下一笔租金核心提示 | 使用 `feeNature='deposit'`、`cadence='once'`、`isOverdueTrackable=false`，并调整 `deriveBillStatus`/`buildRentableUnitSummary`。 |
| FEE-03 | 管理费默认周期性费用，但允许在租约中改为一次性费用 | `management` 作为内置费用规则，默认 `cadence='cycle'`，前端提供一次性切换。 |
| FEE-04 | 自定义费用必须选择性质：周期性费用、一次性费用或押金类费用 | `customFeeItems` 增加 `feeNature`，账单行写入不可由 `itemLabel` 推断。 |
| UTIL-01 | 水电费录入采用上期抄数、本期抄数和单价，由服务端自动计算用量与金额 | `bills-save` 接受读数和单价，服务端校验并计算 `usage/amount`，前端不提交最终金额作为事实。 |
| UTIL-02 | 水电补录时默认带出同房间同类型上一笔读数和单价，并允许备注特殊情况 | 新增查询最近水/电账单的 repository 函数，详情页补录表单读取默认值，`bill.note` 保留备注。 |
| UTIL-03 | orchestrator 提供；`REQUIREMENTS.md` 未定义 | 按 CONTEXT D-21 处理：服务端金额是真相，规划时作为“前端不得自行计算最终账单金额”的派生验收点。 |
| OPEX-01 | 维修、保洁、打理、请人管理等房东支出可以独立记录，金额可选，录入目的为留痕、复盘和导出 | 新增 `owner_expenses` schema/repository/cloud function；维修类可同时建立 `repair_records`。 |
| OPEX-02 | 维修类支出参与房间问题分析；保洁、打理、请人管理等支出不计入维修高频异常 | 问题分析继续只读 `repair_records`，`owner_expenses.expenseType !== 'repair'` 不进入 `buildRoomRepairStats`。 |
| OPEX-03 | orchestrator 提供；`REQUIREMENTS.md` 未定义 | 按 CONTEXT D-27 处理：房东支出按 `occurredAt` 归月，为 Phase 06 导出提供数据基础。 |
| CORR-01 | 编辑租约时只替换未收款的系统生成账单，已收账单和手工账单不得被静默删除 | 改造 `syncBillsForLease`，用 `source/status/receivedAt/receivedAmount` 判断可替换集合，并补保护性测试。 |
| CORR-02 | 租约支持安全删除；一旦产生已收账单、收据或维修/支出关联，则禁止硬删除，只能编辑、更正、结束或作废 | 新增 `leases-delete` 或等价写入口，先返回 blocker summary，再只在无 blocker 时级联删除未收账单。 |
</phase_requirements>

## Summary

Phase 05 不是单纯加字段，而是一次账单事实边界治理。当前代码中 `bills` 已经是租客应收/实收的事实集合，但仍混入了维修费补录入口；`syncBillsForLease` 现在会 `where({ leaseId }).remove()` 后重建所有账单，会删除已收账单和手工补录；`alert-repository.rebuildAlerts` 通过 `clearCollection(alerts)` 全局清空派生提醒。这些都直接违反 Phase 05 已锁定的写入边界，必须作为第一波 P0 任务处理。

建议把本阶段规划成 5 条主线：先修运行时 id/_id 与集合写边界，再稳定租约费用规则和账单行合同，然后落水电抄表，再拆房东支出，最后补安全删除/退租纠错和全链路测试。不要先做 UI 美化或导出预研；Phase 06 会消费 Phase 05 产出的稳定账单/支出字段。

**Primary recommendation:** 先建立“租客账单行合同 + 房东支出合同 + scoped 写入口”三件事，再改表单和详情页展示；所有读侧函数继续只读，不补写业务真相。

## Project Constraints (from AGENTS.md)

- 平台必须是原生微信小程序，后端使用微信云开发/CloudBase 云函数和数据库。
- 第一版只服务单一房东账号，但数据仍必须按 `landlordOpenId` 做隔离，不能全局清空或跨账号聚合。
- 核心数据模型固定为 `asset -> room -> lease`，整租也通过默认整租单元表达。
- 页面层统一通过 service 调云函数，不直接读写集合，也不在前端推导账单或房态真相。
- 第一版 UI 采用黑字白底、功能优先的朴素风格；本阶段 UI 应服务录入准确性，不做高保真重设计。
- 优先采用既有成熟库和官方能力；不要引入新状态系统或平行数据模型。
- GSD 工作流要求不要直接绕过规划执行代码改造；本研究只写本文件，不修改实现。
- 本项目没有 `.claude/skills/` 或 `.agents/skills/` 目录，未发现项目专属 skill 规则。

## Standard Stack

### Core

| Library / Runtime | 当前锁定版本 | Registry 最新版本（2026-04-27 验证） | Purpose | Why Standard |
|---|---:|---:|---|---|
| 微信原生小程序 | 项目运行时 | 官方运行时 | 小程序 UI、页面生命周期、微信登录与云函数调用 | 项目交付形态已锁定，前端服务层已围绕 `wx.cloud.callFunction` 建立。 |
| 微信云开发 / CloudBase | 官方服务 | 官方服务 | 云函数、云数据库、集合读写 | 现有后端全部是云函数 + 云数据库；CloudBase 官方文档支持 `collection.where().get/update/remove`、`doc(_id)`、`limit/skip`。 |
| TypeScript | locked `5.8.3` | `6.0.3` | 小程序与云函数类型约束 | 已有 `tsconfig.json` 和 TS 源码；本阶段不要顺手升级 TS。 |
| Node.js | 本机 `24.14.1`，项目建议 Node 20 LTS | N/A | 云函数本地测试与构建 | 本机可跑测试；部署时仍要按 CloudBase 支持的 Node runtime 校验。 |
| Zod | locked `4.3.6` | `4.3.6` | schema 校验和兼容字段归一 | 已用于 `billSchema`、`leaseSchema`、`repairRecordSchema`，适合继续扩展合同。 |
| Day.js | locked `1.11.20` | `1.11.20` | 日期、账期、逾期和发生日期归月 | 已用于账单生成、房态和详情聚合；避免手写日期计算。 |

### Supporting

| Library / Tool | 当前锁定版本 | Registry 最新版本（2026-04-27 验证） | Purpose | When to Use |
|---|---:|---:|---|---|
| Jest | locked `30.0.5`，`npx jest --version` 输出 `29.7.0` | `30.3.0` | 单元/云函数测试 | 继续使用现有 Jest；不要在本阶段升级或重配。 |
| ts-jest | locked `29.4.1` | `29.4.9` | 运行 TS 测试 | 现有 `jest.config.cjs` 已使用 `preset: 'ts-jest'`。 |
| tdesign-miniprogram | locked `1.13.1` | `1.14.0` | 小程序组件 | 如改表单交互，沿用现有页面风格；不做组件库升级。 |
| miniprogram-api-typings | locked `5.1.2` | `5.1.3` | 微信 API 类型 | 继续沿用。 |
| @cloudbase/wx-cloud-client-sdk | locked `1.8.6` | `1.8.8` | CloudBase 客户端能力 | 本阶段主要走现有 service，不需要新增依赖。 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|---|---|---|
| 继续用 `bills` 表示房东支出 | 新增 `owner_expenses` | 必须新增；把房东支出塞进 `bills` 会污染收据、催租、逾期和收入统计。 |
| 手写表单金额计算 | 服务端用现有 TS + Zod + Day.js 计算 | 必须服务端计算；前端金额只能展示预估或提交读数。 |
| 引入 decimal/money 库 | 继续使用 number，并服务端统一 `Math.round(value * 100) / 100` | 本项目现有金额均为 number；不建议本阶段扩大迁移面。若以后需要严格财务精度，再统一 cents 模型。 |

**Installation:**

本阶段不需要安装新包。规划中不要安排 `npm install`，除非执行阶段发现锁文件损坏。

**Version verification:**

```bash
npm view dayjs version time.modified
npm view zod version time.modified
npm view tdesign-miniprogram version time.modified
npm view @cloudbase/wx-cloud-client-sdk version time.modified
npm view miniprogram-api-typings version time.modified
npm view jest version time.modified
npm view ts-jest version time.modified
npm view typescript version time.modified
```

## Architecture Patterns

### Recommended Project Structure

```text
cloudfunctions/
├── shared/
│   ├── constants/collections.ts          # 增加 ownerExpenses，统一集合名
│   ├── schemas/bill.ts                   # 租客账单行合同
│   ├── schemas/lease.ts                  # 租约固定费用规则和自定义费用性质
│   ├── schemas/owner-expense.ts          # 新增房东支出合同
│   ├── repositories/bill-repository.ts   # 安全账单同步、水电抄表、默认读数
│   ├── repositories/owner-expense-repository.ts
│   ├── repositories/lease-repository.ts  # 编辑/结束/安全删除入口
│   └── runtime.ts                        # 业务 id 查询/更新、分页、scoped remove
├── bills-save/                           # 水电/其他租客应收补录
├── owner-expense-save/                   # 新增房东支出写入口
├── leases-save/                          # 创建/编辑租约 + 安全同步系统账单
└── leases-delete/                        # 新增或合并的安全删除租约入口

miniprogram/
├── services/bill.ts                      # 不再提交水电最终金额为真相
├── services/owner-expense.ts             # 新增支出服务
├── pages/leases-form/                    # 固定费用与自定义费用性质
└── pages/unit-detail/                    # 月度账单、水电补录、维修/支出入口
```

### Pattern 1: 账单行合同先行

**What:** `bills` 中每一行都要能独立说明这是什么钱、谁负责、怎么计算、是否可提醒、是否 legacy。推荐新增字段：

```typescript
type BillFeeType =
  | 'rent'
  | 'deposit'
  | 'management'
  | 'fire_deposit'
  | 'lock_card_deposit'
  | 'water'
  | 'electricity'
  | 'misc'
  | 'custom';

type BillFeeNature = 'recurring' | 'one_time' | 'deposit';

type Bill = {
  type: BillFeeType;              // 保留旧 type 但纳入新枚举；旧 property fallback 为 management
  feeNature: BillFeeNature;       // 不靠 label 猜
  responsibility: 'tenant';       // bills 永远是 tenant
  cadence: 'cycle' | 'once';
  isDepositLike: boolean;
  isOneTime: boolean;
  source: 'system' | 'manual';
  legacy: boolean;
  meterReading?: {
    previousReading: number;
    currentReading: number;
    usage: number;
    unitPrice: number;
  };
};
```

**When to use:** Phase 05 的第一批 schema/repository 改造。详情、提醒、导出、收据之后只读这些字段。

**Example:**

```typescript
// 本地模式：沿用 Zod schema，新增字段用 default/catch 兼容旧账单。
const billSchema = z.object({
  type: billTypeSchema,
  feeNature: z.enum(['recurring', 'one_time', 'deposit']).default('recurring'),
  responsibility: z.literal('tenant').default('tenant'),
  isDepositLike: z.boolean().default(false),
  isOneTime: z.boolean().default(false),
  legacy: z.boolean().default(false),
  source: z.enum(['system', 'manual']).default('system')
});
```

### Pattern 2: 写侧同步只处理“可替换账单”

**What:** `syncBillsForLease` 当前整批删除，必须改为：

1. 生成目标系统账单。
2. 读取该租约现有账单。
3. 保留所有已收账单。
4. 保留所有手工账单，除非明确删除/作废流程。
5. 只删除或作废 `source='system'` 且未收款、无收据引用的账单。
6. 插入新的系统账单。

**When to use:** `createLease/updateLease/endLease/safeDeleteLease` 都经过这个约束，不能在云函数入口绕开 repository。

**Example:**

```typescript
function isReplaceableSystemBill(bill: Bill) {
  return (
    (bill.source ?? 'system') === 'system' &&
    !bill.receivedAt &&
    bill.receivedAmount == null &&
    !bill.receiptId
  );
}
```

### Pattern 3: 房东支出与维修事实解耦但入口可合并

**What:** 前端可以是“记录维修/支出”一个入口，但后端必须按事实归属拆写：

- 真维修：写 `repair_records`；如果有金额，再写 `owner_expenses` 并引用 `repairRecordId`。
- 保洁/打理/请人管理/其他：只写 `owner_expenses`，不写 `repair_records`。
- 金额为空也允许写支出留痕，但统计金额时按 `amount != null` 过滤。

**When to use:** `owner-expense-save` 和详情页支出入口。

**Example:**

```typescript
type OwnerExpense = {
  id: string;
  landlordOpenId: string;
  assetId: string;
  roomId: string | null;
  leaseId: string | null;
  tenantId: string | null;
  repairRecordId: string | null;
  expenseType: 'repair' | 'cleaning' | 'caretaking' | 'labor' | 'other';
  amount: number | null;
  note: string;
  occurredAt: string; // YYYY-MM-DD，Phase 06 按此归月
  createdAt: string;
  updatedAt: string;
};
```

### Pattern 4: 业务 id 查询更新，不依赖 `_id`

**What:** CloudBase `doc(id)` 操作的是文档 ID；本项目业务记录另有 `id` 字段，`add({ data: record })` 当前没有把 `_id` 强制设为业务 `id`。因此 `findById/updateRecord` 用 `doc(id)` 有线上风险。

**When to use:** Phase 05 P0 runtime 改造。

**Example:**

```typescript
export async function findRecordByBusinessId<T extends DbRecord>(
  db: DbLike,
  collectionName: string,
  id: string
) {
  const result = await db.collection(collectionName).where({ id }).get();
  return (result.data?.[0] ?? null) as T | null;
}

export async function updateRecordByBusinessId<T extends DbRecord>(
  db: DbLike,
  collectionName: string,
  id: string,
  changes: Partial<T>
) {
  await db.collection(collectionName).where({ id }).update({ data: changes as Partial<DbRecord> });
  const updated = await findRecordByBusinessId<T>(db, collectionName, id);
  if (!updated) throw new Error(`Record ${id} was not found after update.`);
  return updated;
}
```

### Anti-Patterns to Avoid

- **按 label 推断费用性质：** `“消防押金”`、`“门锁押金”` 这类文本可以变，账单合同必须用 `feeNature/isDepositLike`。
- **在详情页缺账单时补写：** `rentable-unit-detail` 当前只读，这是正确边界；不要为了展示补齐账单。
- **把维修费继续作为 manual bill：** 当前详情页有“维修费”补录到 `bills` 的入口，Phase 05 必须迁移到 `owner_expenses`。
- **全局清空 `alerts`：** 派生集合可以重建，但只能清当前 `landlordOpenId`。
- **升级依赖顺手重构：** 依赖有新版本，但本阶段风险在业务模型，不在依赖版本。

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| 日期和账期计算 | 手写字符串月份加减 | Day.js + 现有 `lease-lifecycle` | 闰月、跨月、到期日比较容易出错。 |
| 输入校验和 legacy fallback | 分散 `if` 判断 | Zod schema + normalizer | 租约/账单/支出字段会继续演进，schema 集中更可测试。 |
| 全量集合读取 | 单次 `.get()` 后内存筛选 | 现有 `listAll()` 分页模式 | CloudBase 查询支持 `limit/skip`，单页读取会造成数据不全。 |
| 账单分类推断 | label/section 正则 | 明确 `feeType/feeNature/responsibility` | Phase 06 导出和收据不能靠文本猜测。 |
| 支出统计 | 从维修备注或账单 label 汇总 | `owner_expenses` | 房东支出与租客应收是不同事实。 |
| 安全删除判断 | 前端按钮隐藏 | 后端 blocker 检查 | 线上数据保护必须在云函数端完成。 |

**Key insight:** 这个阶段最容易返工的是“先把 UI 做出来，再让导出和收据重新猜字段”。正确顺序是先让每条账单和每条支出成为可解释事实，再让 UI 和后续导出消费事实。

## Runtime State Inventory

| Category | Items Found | Action Required |
|---|---|---|
| Stored data | `leases` 现有 `feeRules` 只有 `rent/deposit/water/electricity/property/misc/customFeeItems`；`bills` 现有 `type` 只有 `rent/deposit/water/electricity/property/misc/custom`，缺 `feeNature/responsibility/legacy/meterReading`；线上可能已有已收账单、手工账单。 | 代码必须先支持 legacy fallback；建议提供一次性 backfill/migration 云函数或受控脚本，把旧 `property` 映射为管理费、旧押金标记为 `deposit`，不得在租约编辑时删除旧账单。 |
| Live service config | CloudBase 需要新增 `owner_expenses` 集合；新增云函数可能包括 `owner-expense-save`、`leases-delete`；当前无法直接读取线上 CloudBase 数据。 | 通过 `ensureCollectionExists/insertRecord` 首写自动建集合；部署清单必须包含新云函数和 shared 副本同步。 |
| OS-registered state | 未发现 pm2、systemd、launchd、定时任务或本地服务注册；本项目主要是小程序 + 云函数。 | None — verified by repo scan for scripts/config and cloudfunction layout. |
| Secrets/env vars | 未发现 `.env*` 或 secret 配置；提醒模板配置不属于本阶段；CloudBase env 在微信开发者工具/项目配置侧。 | None for code rename；不要在本阶段引入新 secret。 |
| Build artifacts | 存在每个云函数内的 `shared/` 副本；还发现 `cloudfunctions/*/index 2.*`、`package 2.json` 旧拷贝文件，容易污染搜索判断。 | 实现阶段改 `cloudfunctions/shared` 后必须同步到各函数 `shared/`；规划时忽略 `* 2.*` 噪声，必要时另开清理任务但本阶段不主动改。 |

## Common Pitfalls

### Pitfall 1: 租约编辑删除历史账单

**What goes wrong:** 当前 `syncBillsForLease` 会删除该租约所有账单后重建。  
**Why it happens:** 把“未收系统账单重算”和“账单历史事实”混成一个操作。  
**How to avoid:** 只替换可替换系统账单；已收和手工账单永远保留，安全删除租约走单独明确流程。  
**Warning signs:** 测试里期望 `water` 手工账单在租约更新后消失；实现里出现 `where({ leaseId }).remove()`。

### Pitfall 2: 业务 id 与 `_id` 混用

**What goes wrong:** 本地 mock 里 `doc(id)` 能工作，线上 CloudBase 可能因 `_id !== id` 找不到或更新不到。  
**Why it happens:** `insertRecord` 只把业务 `id` 写入 data，没有强制 `_id`。  
**How to avoid:** runtime 统一用 `where({ id })` 查改业务记录，或显式设计 `_id=id` 的迁移；本阶段推荐先查改业务 `id`。  
**Warning signs:** repository 使用 `findById/updateRecord`，或 `db.collection(...).doc(current.id).update(...)`。

### Pitfall 3: 房东支出污染租客账单

**What goes wrong:** 维修费进入 `bills` 后会被催租、收据、收入统计和逾期逻辑消费。  
**Why it happens:** 当前详情页补录类型里有 `维修费`，会以 custom bill 写入。  
**How to avoid:** 维修/支出入口拆写 `repair_records` 和 `owner_expenses`，`bills-save` 拒绝维修/支出类标签或类型。  
**Warning signs:** `MANUAL_BILL_TYPE_KEYS` 仍含 `repair`，或 `itemLabel` 包含维修、保洁、打理仍写入 `bills`。

### Pitfall 4: 水电金额前端算成真相

**What goes wrong:** 不同页面/版本计算规则不一致，后续收据和导出无法对账。  
**Why it happens:** 只把旧 `amount` 字段当作输入。  
**How to avoid:** 前端提交读数和单价，后端校验 `current >= previous` 后计算 `usage/amount` 并写入账单。  
**Warning signs:** `saveBill(payload)` 仍要求水电传 `amount`，没有 `previousReading/currentReading/unitPrice`。

### Pitfall 5: 派生提醒全局清空

**What goes wrong:** 一个房东打开首页会删掉其他房东的 alerts。  
**Why it happens:** `rebuildAlerts` 使用 `clearCollection(db, COLLECTIONS.alerts)`。  
**How to avoid:** `rebuildAlertsForLandlord(db, landlordOpenId, input)` 只删 `where({ landlordOpenId })`。  
**Warning signs:** 测试只覆盖单房东，或 mock 中其他房东 alert 没有断言保留。

## Code Examples

Verified patterns from local code and official sources:

### CloudBase 条件更新/删除

```typescript
// Source: CloudBase official docs: docs.cloudbase.net/en/api-reference/server/node-sdk/database
await db.collection(COLLECTIONS.bills)
  .where({ id: billId, landlordOpenId })
  .update({ data: { updatedAt: now } });

await db.collection(COLLECTIONS.alerts)
  .where({ landlordOpenId })
  .remove();
```

### 水电账单服务端计算

```typescript
function calculateMeterBill(input: {
  previousReading: number;
  currentReading: number;
  unitPrice: number;
}) {
  if (input.currentReading < input.previousReading) {
    throw new Error('currentReading must be greater than or equal to previousReading.');
  }

  const usage = input.currentReading - input.previousReading;
  const amount = Math.round(usage * input.unitPrice * 100) / 100;
  return { usage, amount };
}
```

### 只让租客账单参与逾期

```typescript
function isBillOverdueTrackable(bill: Pick<Bill, 'feeNature' | 'responsibility'>) {
  return bill.responsibility === 'tenant' && bill.feeNature !== 'deposit';
}
```

### 安全删除租约 blocker

```typescript
type LeaseDeleteBlocker = 'paid_bill' | 'receipt' | 'repair_record' | 'owner_expense';

function hasPaidBill(bill: Pick<Bill, 'receivedAt' | 'receivedAmount'>) {
  return Boolean(bill.receivedAt && bill.receivedAmount != null);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| 租约编辑时整批重建账单 | 只替换未收款系统生成账单 | Phase 05 必须变更 | 保留已收、手工、水电和未来收据引用。 |
| 水电费手填金额 | 服务端抄表计算 | Phase 05 必须变更 | 可导出读数/用量/单价，不靠备注追溯。 |
| 维修费作为补录账单 | 房东支出独立集合 | Phase 05 必须变更 | 收据和催租只面对租客应收。 |
| 费用性质靠 `type/section/label` 推断 | `feeNature/responsibility/isDepositLike` 事实字段 | Phase 05 必须变更 | Phase 06 不重新推导分类。 |
| `alerts` 全局重建 | 按 `landlordOpenId` scoped 重建 | Phase 05 必须变更 | 避免多房东数据互相影响。 |

**Deprecated/outdated:**

- `property` 作为管理费 type：建议兼容读取，但新账单写 `management` 或至少写 `feeType='management'`。
- `repair` 作为手工账单类型：必须从月度账单补录中移除，迁移到 `owner_expenses`。
- `findById/updateRecord` 的 `doc(id)` 实现：线上有 `_id/id` 不一致风险，应改为业务 id 查询更新。

## Open Questions

1. **`UTIL-03` 和 `OPEX-03` 的正式需求文案缺失**
   - What we know: orchestrator 提供了这两个 ID，但 `.planning/REQUIREMENTS.md` 只有 `UTIL-01/02` 和 `OPEX-01/02`。
   - What's unclear: planner 是否需要新建需求追踪条目。
   - Recommendation: 不阻塞规划；把 `UTIL-03` 映射为“服务端金额真相”，`OPEX-03` 映射为“支出按发生日期归月”。

2. **旧线上数据是否需要实际 backfill**
   - What we know: 代码必须兼容旧账单和旧租约；线上数据不可在研究阶段读取。
   - What's unclear: 当前 CloudBase 是否已有生产数据，以及是否接受一次性迁移。
   - Recommendation: 规划中先做 runtime fallback + 测试；再加可手动执行的迁移函数/脚本，不自动跑破坏性迁移。

3. **安全删除租约是否删除未收手工账单**
   - What we know: D-30 要级联删除未收账单，D-09 要手工账单除明确删除/作废流程外保留。
   - What's unclear: “安全删除租约”的二次确认是否足够明确。
   - Recommendation: 后端返回将删除的未收账单数量；前端二次确认后允许删除该租约下未收账单，已收账单永远 blocker。

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|---|---|---:|---|---|
| Node.js | 本地测试、类型检查 | ✓ | `v24.14.1` | CloudBase 部署时按云端 runtime 校验；本地不阻塞。 |
| npm | 依赖脚本 | ✓ | `11.11.0` | — |
| npx | Jest/tsc 调用 | ✓ | `/Users/zengzhipeng/.local/bin/npx` | — |
| Jest | 单元/云函数测试 | ✓ | `npx jest --version` 输出 `29.7.0`；lock 为 `30.0.5` | 使用 `npm test`，不要依赖全局 Jest。 |
| TypeScript | 类型检查 | ✓ | `npx tsc --version` 输出 `5.9.3`；lock 为 `5.8.3` | 使用 `npm run typecheck`。 |
| 微信开发者工具 | 小程序手动联调 | ✓ | `wechatwebdevtools.app` | 无自动化 fallback；执行阶段可先用 Jest 覆盖核心逻辑。 |
| CloudBase CLI | 云函数部署 | ✗ | — | 使用微信开发者工具上传部署；本阶段规划不要假设 CLI 可用。 |

**Missing dependencies with no fallback:**

- None for planning and automated validation.

**Missing dependencies with fallback:**

- CloudBase CLI missing — 可用微信开发者工具部署；本阶段自动验证以 Jest/typecheck 为主。

**Baseline validation run:**

```bash
npm test -- --runTestsByPath tests/cloud/bills-sync.spec.ts tests/cloud/bills-save.spec.ts tests/cloud/repair-record-save.spec.ts --runInBand
```

结果：3 个 test suite、7 个 test 全部通过。注意这些是旧契约基线，Phase 05 要修改部分测试期望。

## Validation Architecture

### Test Framework

| Property | Value |
|---|---|
| Framework | Jest + ts-jest（`jest.config.cjs`） |
| Config file | `jest.config.cjs` |
| Quick run command | `npm test -- --runTestsByPath tests/cloud/bills-sync.spec.ts tests/cloud/bills-save.spec.ts tests/cloud/repair-record-save.spec.ts --runInBand` |
| Full suite command | `npm test -- --runInBand && npm run typecheck` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|---|
| FEE-01 | 租约固定内置五项生成账单 | unit/integration | `npm test -- --runTestsByPath tests/cloud/bills-sync.spec.ts -t "fixed built-in fees" --runInBand` | ❌ Wave 0 |
| FEE-02 | 消防/锁卡押金不逾期、不作为下一笔租金核心提示 | unit | `npm test -- --runTestsByPath tests/domain/bill-status.spec.ts tests/domain/rentable-unit-summary.spec.ts --runInBand` | ❌ Wave 0 |
| FEE-03 | 管理费默认周期性且可一次性 | integration | `npm test -- --runTestsByPath tests/cloud/leases-save-billing.spec.ts --runInBand` | ❌ Wave 0 |
| FEE-04 | 自定义费用必须写入性质 | unit/integration | `npm test -- --runTestsByPath tests/cloud/bills-sync.spec.ts --runInBand` | ❌ Wave 0 |
| UTIL-01 | 水电读数由服务端计算金额 | integration | `npm test -- --runTestsByPath tests/cloud/bills-save.spec.ts --runInBand` | ❌ Wave 0 |
| UTIL-02 | 水电默认带出上一笔读数/单价并保留备注 | integration | `npm test -- --runTestsByPath tests/cloud/bills-save.spec.ts tests/cloud/rentable-unit-detail-billing.spec.ts --runInBand` | ❌ Wave 0 |
| UTIL-03 | 前端不提交最终水电金额为事实 | integration/static | `npm test -- --runTestsByPath tests/cloud/bills-save.spec.ts --runInBand && npm run typecheck` | ❌ Wave 0 |
| OPEX-01 | 房东支出独立记录，金额可选 | integration | `npm test -- --runTestsByPath tests/cloud/owner-expense-save.spec.ts --runInBand` | ❌ Wave 0 |
| OPEX-02 | 只有维修类参与维修异常 | unit/integration | `npm test -- --runTestsByPath tests/cloud/owner-expense-save.spec.ts tests/cloud/alerts-list.spec.ts --runInBand` | ❌ Wave 0 |
| OPEX-03 | 支出按发生日期归月，为导出准备 | unit | `npm test -- --runTestsByPath tests/cloud/owner-expense-save.spec.ts --runInBand` | ❌ Wave 0 |
| CORR-01 | 租约编辑保留已收和手工账单 | integration | `npm test -- --runTestsByPath tests/cloud/bills-sync.spec.ts tests/cloud/leases-save-billing.spec.ts --runInBand` | ❌ Wave 0 |
| CORR-02 | 安全删除租约有 blocker 且级联未收账单 | integration | `npm test -- --runTestsByPath tests/cloud/leases-delete.spec.ts --runInBand` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** 对应模块的 `--runTestsByPath` 快速命令。
- **Per wave merge:** `npm test -- --runInBand`。
- **Phase gate:** `npm test -- --runInBand && npm run typecheck`，并在微信开发者工具手动验证详情页录入流。

### Wave 0 Gaps

- [ ] `tests/cloud/bills-sync.spec.ts` — 改写旧“全部替换”期望，覆盖 CORR-01、FEE-01、FEE-03、FEE-04。
- [ ] `tests/domain/bill-status.spec.ts` — 覆盖 deposit-like 不逾期。
- [ ] `tests/domain/rentable-unit-summary.spec.ts` — 覆盖 deposit-like 不作为下一笔租金核心提示。
- [ ] `tests/cloud/bills-save.spec.ts` — 覆盖水电读数、默认上一笔读数、备注、拒绝维修/支出写入 bills。
- [ ] `tests/cloud/owner-expense-save.spec.ts` — 新增支出记录、金额可选、维修类关联维修事实、非维修类不进维修异常。
- [ ] `tests/cloud/leases-delete.spec.ts` — 新增安全删除 blocker 和级联未收账单。
- [ ] `tests/cloud/dashboard-home.spec.ts` / `tests/cloud/alerts-list.spec.ts` — 明确断言其他 `landlordOpenId` 的 alerts 不被清空。
- [ ] `tests/helpers/mock-cloud.ts` — 增加 `ownerExpenses` 集合映射，并尽量模拟 `_id !== id` 场景。

## Sources

### Primary (HIGH confidence)

- `.planning/phases/05-费用与账单模型优化/5-CONTEXT.md` — Phase 05 锁定决策。
- `.planning/REQUIREMENTS.md` — `FEE-*`、`UTIL-*`、`OPEX-*`、`CORR-*` 需求定义；确认 `UTIL-03/OPEX-03` 未在文件中定义。
- `.planning/DATA-COLLECTION-MATRIX.md` — 集合职责、写入口、强约束和反模式。
- `cloudfunctions/shared/repositories/bill-repository.ts` — 当前账单生成、同步、收款和补录逻辑。
- `cloudfunctions/shared/schemas/bill.ts` / `cloudfunctions/shared/schemas/lease.ts` — 当前账单与租约费用 schema。
- `cloudfunctions/shared/runtime.ts` — 当前分页、`findById/updateRecord`、集合清理实现。
- `cloudfunctions/shared/repositories/alert-repository.ts` — 当前 `alerts` 全局重建风险。
- `cloudfunctions/shared/repositories/repair-record-repository.ts` — 当前维修事实和异常统计口径。
- CloudBase official docs — Database/CRUD: https://docs.cloudbase.net/en/api-reference/server/node-sdk/database and https://docs.cloudbase.net/en/api-reference/webv2/database
- Jest official docs — TypeScript with ts-jest and Jest 30 notes: https://jestjs.io/docs/getting-started and https://jestjs.io/blog/2025/06/04/jest-30

### Secondary (MEDIUM confidence)

- `npm view` registry checks on 2026-04-27 — package latest versions and modified timestamps.
- Local environment probes — Node/npm/npx/Jest/TypeScript versions and WeChat DevTools app presence.

### Tertiary (LOW confidence)

- None used as authoritative source.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — package versions verified from lockfile and npm registry; no new dependencies needed.
- Architecture: HIGH — driven by locked Phase 05 decisions and current repository code.
- Pitfalls: HIGH — risks are directly visible in current code (`syncBillsForLease`, `rebuildAlerts`, `doc(id)`).
- Runtime state: MEDIUM — source schema and repo artifacts verified; live CloudBase data not accessible from research.
- Environment: HIGH for local tools; MEDIUM for deployment because CloudBase CLI is missing and deployment depends on WeChat DevTools/cloud environment.

**Research date:** 2026-04-27  
**Valid until:** 2026-05-27 for local architecture; re-check CloudBase/Jest docs before dependency or deployment workflow changes.
