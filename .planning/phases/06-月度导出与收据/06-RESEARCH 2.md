# 第 6 阶段：月度导出与收据 - Research

**研究时间：** 2026-04-28
**状态：** Ready for planning

## 目标

Phase 06 要在 Phase 05 已稳定的账单与房东支出口径之上，交付两类能力：

1. 月度经营导出：按月份、全部/房源/房间范围生成一个多 sheet Excel。
2. 收据：针对已收租客账单生成固定快照，支持预览、保存/导出、作废重开。

本阶段不重新推导费用性质，不把房东支出写入租客账单，不做 Excel 导入，也不做微信官方提醒发送闭环。

## 现有代码事实

### 可复用的数据合同

- `cloudfunctions/shared/schemas/bill.ts` 已包含 Phase 05 所需字段：`feeNature`、`responsibility`、`cadence`、`isDepositLike`、`isOneTime`、`source`、`meterReading`、`receivedAt`、`receivedAmount`。
- `cloudfunctions/shared/schemas/owner-expense.ts` 已包含 `expenseType`、`amount`、`occurredAt`、`monthKey`、`leaseId`、`tenantId`、`repairRecordId`。
- `cloudfunctions/shared/constants/collections.ts` 已声明 `receipts`，Phase 05 删除保护已经把收据引用当成硬删除 blocker。
- `tests/helpers/mock-cloud.ts` 已有 `owner_expenses` 和 `receipts` mock 集合，可以承接 Phase 06 测试。

### 已建立实现模式

- 小程序页面通过 `miniprogram/services/*` 调云函数，不直接操作集合。
- 云函数共享逻辑放在 `cloudfunctions/shared/*`，可部署函数目录内有各自 `shared` 副本。
- 写入真相集合必须通过明确云函数；读侧详情/列表函数不得补写或重建账单。
- 项目根 `package.json` 已有 `xlsx` 依赖，云函数若直接生成 Excel，需要在对应函数 `package.json` 里补 `xlsx` 依赖。

### 入口候选

- 月度导出适合从 `pages/profile` 或 `pages/ops` 进入全局导出页，也可在单元详情内带房间筛选进入。
- 收据适合从 `pages/unit-detail` 的月度账单/已收账单进入；预览页应独立，避免详情页继续膨胀。

## 设计建议

### 月度导出

推荐新增云函数 `report-export-create`，服务端聚合并生成 Excel 文件：

- 输入：`month`、可选 `assetId`、可选 `roomId`。
- 读取：`assets`、`rooms`、`tenants`、`leases`、`bills`、`owner_expenses`、`receipts`。
- 写入：可选 `report_exports` 元数据；Excel 文件建议用云存储 `uploadFile` 保存并返回 `fileID`、`fileName`、`sheetNames`、`summary`。
- 过滤：所有集合按 `landlordOpenId` 限定；导出范围再按 `assetId` / `roomId` 收窄。
- 归月：租客账单以 `dueDate.slice(0, 7)` 做应收月，同时保留 `receivedAt`；房东支出以 `monthKey` / `occurredAt` 归月。

第一版必须生成四个 sheet：

1. `月度明细`：一行一个房间，服务日常算账。
2. `账单明细`：一行一个租客应收/实收费用项。
3. `房东支出明细`：一行一个房东支出。
4. `退租支出明细`：第一版可先输出押金类退还/退租支出占位口径；没有退租支出时输出带表头空表。

`月度明细` 的 `房租水电合计` 只能统计租客侧收入项，不能混入维修、保洁、打理等房东支出。维修费和其他支出可在同一行展示，但必须另列，不能计入租客收入合计。

### 收据

推荐新增 `receipt-create` 与 `receipt-void` 云函数，并新增共享 `receipt` schema/repository：

- `receipt-create` 输入可支持 `billIds` 或 `month + roomId`。第一版应只允许选择已收款且未作废、属于当前房东、责任方为租客的账单。
- 收据快照保存账单项目、房源/房间/租客名称、合计金额、收款日期、收款人、备注、生成时间。
- 收据创建后应把相关 `bills` 写入 `receiptId`，让后续删除保护、重复开票保护和导出追溯有稳定引用。
- `receipt-void` 只更新收据状态为 `voided`，写入 `voidedAt`、`voidReason`；不删除账单，不改写旧收据内容。
- 重开通过重新调用 `receipt-create` 创建新收据，并在新收据上记录 `reissueFromReceiptId`。

收据预览第一版可采用小程序页面展示结构化快照，不强行生成 PDF。保存/导出能力可先提供复制/保存收据图片或打开文档的实现接口，具体受微信小程序 API 与云存储能力约束。

## 风险与防护

1. **导出只拉第一页数据。** 必须复用 `listAll()` 或等价分页读取，不能单次 `.get()`。
2. **跨房东数据泄漏。** 导出和收据创建必须所有查询都按 `landlordOpenId` 过滤。
3. **收据动态读取当前账单。** 收据必须保存完整快照；预览历史收据只能读 `receipts`。
4. **重复生成收据。** 已有关联 `receiptId` 的账单不应被再次生成有效收据，除非旧收据已作废并按重开流程记录。
5. **Excel 体积和返回限制。** 云函数不要直接返回二进制大对象；生成文件后返回云存储 `fileID` 更稳。
6. **退租支出数据缺口。** 当前 Phase 05 有结束租约和押金类账单，但退租现金流出未完全独立建模。Phase 06 第一版应输出退租支出明细 sheet 和占位/可追溯口径，不在计划中偷换为账单收入。

## 推荐计划拆分

1. `06-01`：建立导出/收据领域合同、schema、测试基座和路由入口规划。
2. `06-02`：实现 `report-export-create`、多 sheet Excel 生成和导出服务。
3. `06-03`：实现 `receipt-create` / `receipt-void`、收据快照、重复生成与作废保护。
4. `06-04`：接入小程序导出页、收据预览页、单元详情入口，并完成阶段级回归。

## 验证建议

- 导出聚合：`tests/cloud/report-export-create.spec.ts`
- Excel workbook：断言 sheet 名称、表头、关键单元格和合计口径。
- 收据快照：`tests/cloud/receipt-create.spec.ts`、`tests/cloud/receipt-void.spec.ts`
- 前端入口：`tests/cloud/unit-detail-flow.spec.ts` 或轻量静态断言。
- 阶段结束：`npm test -- --runInBand && npm run typecheck`

---
*Phase: 06-月度导出与收据*
