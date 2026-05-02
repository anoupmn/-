# 退租结算增强方案

> 创建：2026-05-02 | 分支：main | 回退点：`86fa74b`

## 目标

结束租约前，统一结算水电费、退余下租金、退押金，一切计入现有账单系统，报表自动同步。

## 核心设计原则

| 原则 | 说明 |
|------|------|
| 一切 = 账单 | 退租金、退押金是普通账单，不做独立结算模块 |
| `responsibility` 区分方向 | `'tenant'` = 租客应付，`'landlord'` = 房东应退（退款账单），`amount` 永远正数 |
| 水电走现有流程 | 复用 `createMeterBill`，不在退租云函数里重复实现抄表 |
| 报表自动跟进 | 月度导出"退租支出明细"从查询账单集合自动生成 |

---

## 一、账单 Schema 改动

### 1.1 新增账单类型

`cloudfunctions/shared/schemas/bill.ts` — `billTypeSchema`:

```
现有: 'rent' | 'deposit' | 'management' | 'fire_deposit' | 'lock_card_deposit' | 'water' | 'electricity' | 'property' | 'misc' | 'custom'
新增: 'rent_refund' | 'deposit_refund'
```

### 1.2 扩展责任方

`cloudfunctions/shared/schemas/bill.ts` — `responsibility`:

```typescript
// 现有
responsibility: z.literal('tenant').catch('tenant').default('tenant')

// 改为
responsibility: z.enum(['tenant', 'landlord']).catch('tenant').default('tenant')
```

### 1.3 退租时生成的退款账单

| 账单 | `type` | `section` | `responsibility` | `amount` | `feeNature` | `note` |
|------|--------|-----------|-------------------|----------|-------------|--------|
| 退余下租金 | `rent_refund` | `rent` | `landlord` | 按天折算 | `one_time` | `退余下租金 N天` |
| 退还押金 | `deposit_refund` | `deposit` | `landlord` | 押金金额 | `deposit` | `退还押金` |
| 退消防押金 | `deposit_refund` | `deposit` | `landlord` | 消防押金 | `deposit` | `退还消防押金` |
| 退门禁卡押金 | `deposit_refund` | `deposit` | `landlord` | 门禁卡押金 | `deposit` | `退还门禁卡押金` |

> 注：水电费不在这个表里，走现有 `createMeterBill`（`type: 'water'/'electricity'`, `responsibility: 'tenant'`），退租前由房东手动补录。

---

## 二、余下租金计算

```
每日租金 = rentAmount / billingCycleDays
剩余天数 = max(0, endDate - 退租日期)
退余下租金 = 每日租金 × 剩余天数（保留2位小数，向上取整）
```

- 退租日期 >= endDate（期满结束）→ 不计算，退款天数为 0
- 前端面板可手动调整退款天数

---

## 三、云函数改造：`leases-end`

### 3.1 `endLease()` 扩展参数

`cloudfunctions/shared/repositories/lease-repository.ts` — `endLease()`:

```typescript
interface SettlementOptions {
  voidFutureSystemBills?: boolean;
  rentRefundDays?: number;          // 退租金天数，0 或 undefined = 不生成
  refundDeposit?: boolean;
  refundFireDeposit?: boolean;
  refundLockCardDeposit?: boolean;
}

export async function endLease(
  db: DbLike,
  leaseId: string,
  event: CloudEventBase,
  settlement?: SettlementOptions
)
```

### 3.2 执行流程

```
endLease(db, leaseId, event, settlement)
│
├─ 1. 关闭租约（现有逻辑）
│     ├─ closeLeaseAndDeriveUnitStatus
│     ├─ 更新 lease.closedAt
│     └─ 关闭同房间重复活跃租约
│
├─ 2. settlement?.voidFutureSystemBills
│     └─ 查询该租约 dueDate > closedAt 的未收系统账单
│     └─ 物理删除（符合现有 syncBillsForLease 的删除惯例）
│
├─ 3. settlement?.rentRefundDays > 0
│     └─ 计算退款金额 = rentAmount / billingCycleDays × rentRefundDays
│     └─ insertRecord: type='rent_refund', responsibility='landlord', section='rent'
│
├─ 4. settlement?.refundDeposit
│     └─ insertRecord: type='deposit_refund', responsibility='landlord',
│         section='deposit', amount = depositAmount
│
├─ 5. settlement?.refundFireDeposit
│     └─ insertRecord: type='deposit_refund', amount = fireDepositAmount
│
├─ 6. settlement?.refundLockCardDeposit
│     └─ insertRecord: type='deposit_refund', amount = lockCardDepositAmount
│
└─ 7. 返回 { lease, currentStatus, unpaidBillSummary, settlementSummary }
```

### 3.3 返回值扩展

```typescript
return {
  lease: updatedLease,
  currentStatus: result.currentStatus,
  unpaidBillSummary: { count, amount },
  settlementSummary: {
    voidedBillCount: number,
    createdRefundBills: Array<{ type: string; amount: number }>
  }
};
```

### 3.4 `leases-end` 入口改造

`cloudfunctions/leases-end/index.ts` — 接收 `settlement` 参数透传给 `endLease()`:

```typescript
export interface LeaseEndEvent extends CloudEventBase {
  leaseId: string;
  settlement?: SettlementOptions;
}
```

### 3.5 编译 JS 镜像

同步更新以下 JS 文件（从 TS 编译产物）:
- `cloudfunctions/leases-end/index.js`
- `cloudfunctions/shared/repositories/lease-repository.js`
- `cloudfunctions/leases-end/shared/repositories/lease-repository.js`
- `cloudfunctions/shared/schemas/bill.js`

---

## 四、前端改造：unit-detail 退租结算面板

`miniprogram/pages/unit-detail/index.ts` + `wxml` + `wxss`

### 4.1 交互流程

```
点击"结束租约"
    ↓
弹出退租结算面板（非直接执行）
    ↓
面板展示:
  ┌──────────────────────────────────────────┐
  │  退租结算                                 │
  │                                           │
  │  📋 未收账单：N 笔，合计 ¥X,XXX          │
  │     [去收款]                               │
  │                                           │
  │  💧 水费：最后记录 2026-04-01 ⚠️ 超1个月  │
  │     [补录水费读数]                         │
  │  ⚡ 电费：最后记录 2026-04-01 ⚠️ 超1个月  │
  │     [补录电费读数]                         │
  │                                           │
  │  💰 余下租金（提前退租时显示）              │
  │     租约到期：2026-06-30                   │
  │     剩余 58 天 | 每日 ¥33.33              │
  │     预估：¥1,933                           │
  │     [✅ 生成退款账单 天数: 58]              │
  │                                           │
  │  🔑 押金（有押金时显示）                    │
  │     🏠 押金 ¥2,000   [✅ 退还]             │
  │     🔥 消防押金 ¥0   [  ] 退还             │
  │     🚪 门禁卡 ¥100   [✅ 退还]             │
  │                                           │
  │     ┌──────────┐  ┌──────────────┐        │
  │     │  取消     │  │  确认退租结算  │        │
  │     └──────────┘  └──────────────┘        │
  └──────────────────────────────────────────┘
```

### 4.2 面板数据来源

| 面板区域 | 数据来源 | 说明 |
|---------|---------|------|
| 未收账单 | `detail.activeLease.bills` 中 `!receivedAt` 的 | 已有字段 |
| 水电费状态 | `detail.monthlyBillGroups` 中最后一次 water/electricity 账单的 `dueDate` | 超过 30 天标红 |
| 余下租金 | `endDate - today`，`rentAmount / billingCycleDays` | 天数可手动调整 |
| 押金 | `detail.activeLease.depositAmount`, `feeRules.{fireDeposit,lockCardDeposit}.amount` | 押金=0 时不显示行 |

### 4.3 panel 状态结构

```typescript
settlementDialogVisible: boolean,
settlement: {
  unpaidCount: number,
  unpaidTotal: number,
  waterLastDate: string,          // 空 = 无记录
  electricityLastDate: string,
  rentRefundDays: number,         // 0 = 不退款
  rentRefundEstimate: number,
  refundDeposit: boolean,
  refundFireDeposit: boolean,
  refundLockCardDeposit: boolean,
  submitting: boolean
}
```

### 4.4 确认结算调用

```typescript
const result = await endLease({
  leaseId,
  settlement: {
    voidFutureSystemBills: true,
    rentRefundDays: this.data.settlement.rentRefundDays,
    refundDeposit: this.data.settlement.refundDeposit,
    refundFireDeposit: this.data.settlement.refundFireDeposit,
    refundLockCardDeposit: this.data.settlement.refundLockCardDeposit
  }
});
```

---

## 五、月度导出报表同步

`cloudfunctions/shared/repositories/report-export-repository.ts`

### 5.1 月度明细行 — 退租支出字段

```typescript
// 现有（硬编码 0）
退租支出: 0

// 改为（查询该月退款账单）
const checkoutRefundBills = bills.filter(
  (b) => b.responsibility === 'landlord' && ['rent_refund', 'deposit_refund'].includes(b.type)
);
const checkoutExpense = sumBills(checkoutRefundBills, (b) => b.amount);
// 填入 MonthlyDetailRow.退租支出
```

### 5.2 退租支出明细 sheet

```typescript
// 现有（空数组）
const checkoutExpenseSheet: CheckoutExpenseDetailRow[] = [];

// 改为（查询当月 landlord 责任账单）
const checkoutExpenseSheet = checkoutRefundBills.map(bill => ({
  房源: asset?.name,
  房间: room?.name,
  租客: tenant?.name,
  租约期间: `${lease.startDate} ~ ${lease.endDate}`,
  支出类型: bill.type === 'rent_refund' ? '余下租金' : '退还押金',
  金额: bill.amount,
  日期: bill.createdAt,
  备注: bill.note
}));
```

### 5.3 summary 扩展

```typescript
summary = {
  ...previousFields,
  退租支出: checkoutExpense  // 新增字段
}
```

---

## 六、实施步骤

| 步骤 | 内容 | 涉及文件 | 风险 |
|------|------|---------|------|
| **1** | 扩展 bill schema | `schemas/bill.ts` + `.js` | 低，仅加类型，向后兼容 |
| **2** | 改造 `endLease()` | `lease-repository.ts` + `.js` (shared + leases-end 副本) | 中，需正确传递参数 |
| **3** | 更新 `leases-end` 入口 | `leases-end/index.ts` + `.js` | 低 |
| **4** | 前端结算面板 | `unit-detail/index.ts`, `.wxml`, `.wxss` | 中，UI 工作量大 |
| **5** | 报表同步 | `report-export-repository.ts` + `.js` | 低 |
| **6** | 单元测试 | `leases-end.spec.ts` | 中 |
| **7** | 编译 JS 镜像 + typecheck | `npm run typecheck` | 低 |

---

## 七、测试覆盖

`tests/cloud/leases-end.spec.ts` 需新增：

1. `ends lease with settlement and voids future unpaid system bills`
2. `ends lease early and creates rent refund bill`
3. `ends lease and creates deposit refund bills`
4. `ends lease with all settlement options combined`
5. `ending expired lease does not create rent refund even if days specified`

---

## 八、不涉及范围（明确排除）

- ❌ 不创建独立的"结算记录"集合 — 一切走 bills
- ❌ 不在退租云函数中实现水电气读表 — 走现有 `createMeterBill`
- ❌ 不实现自动扣款/线上退款 — 退款账单仅作记录，实际退钱线下操作
- ❌ 不做押金部分抵扣（如扣维修费后净退）— 房东在面板中手动取消勾选或事后编辑账单即可
- ❌ 不退租约内的管理费/物业费等周期性费用
