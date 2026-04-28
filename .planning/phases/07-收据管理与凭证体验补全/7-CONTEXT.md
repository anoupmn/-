# 第 7 阶段：收据管理与凭证体验补全 - 上下文

## 背景

Phase 06 已经完成基础收据闭环：

- `receipt-create`：从已收租客账单生成收据快照
- `receipt-get`：读取历史收据快照
- `receipt-void`：作废收据并保留旧快照
- `pages/receipt`：展示收据预览，支持作废和重开
- `unit-detail`：已收账单显示“生成收据 / 查看收据”

但这仍偏“账单详情里的单张收据功能”，还不是个人房东日常会使用的完整收据管理体验。

## 阶段目标

补齐收据记录管理与正式凭证体验，让用户能：

1. 在业务维护中进入收据记录管理
2. 按月份、房源、房间、租客和状态筛选收据
3. 查看收据与账单、房间、租客、作废/重开关系
4. 作废时填写原因，重开时保留来源追溯
5. 对一个房间某个月的多笔已收账单合并开具收据
6. 保存或分享收据，形成接近真实纸质凭证的体验

## 已有基础

- `cloudfunctions/shared/schemas/receipt.ts`
- `cloudfunctions/shared/repositories/receipt-repository.ts`
- `cloudfunctions/receipt-create`
- `cloudfunctions/receipt-get`
- `cloudfunctions/receipt-void`
- `miniprogram/services/receipt.ts`
- `miniprogram/pages/receipt`
- `miniprogram/pages/unit-detail`
- `tests/cloud/receipt-create.spec.ts`
- `tests/cloud/receipt-void.spec.ts`
- `tests/cloud/unit-detail-flow.spec.ts`

## 关键设计决策

- 收据只针对租客已收款项，不包含房东支出。
- 收据内容必须保存快照，不能动态读取当前账单重算。
- 作废不删除旧收据，不删除账单历史。
- 重开生成新收据，并通过 `reissueFromReceiptId` 关联旧收据。
- 已有关联有效收据的账单不得重复生成有效收据。
- 收据管理入口应放在业务维护，不放在首页。
- 房间详情仍保留“生成/查看收据”的上下文入口。

## 需要规划的能力

### 收据记录管理

- 新增收据记录列表页
- 支持按月份、房源、房间、租客、状态筛选
- 支持打开、作废、重开
- 支持从记录回到房间详情

### 合并开具收据

- 支持按 `month + roomId` 生成一个月多笔已收账单的收据
- 前端需要明确展示可纳入收据的账单项
- 已开具有效收据的账单不得重复选择

### 作废原因

- 作废弹窗必须让用户填写原因
- 作废原因展示在旧收据预览中
- 重开后新收据展示来源关系或重开提示

### 保存/分享

- 优先评估小程序可落地能力：
  - 保存为图片
  - 分享页面
  - 复制收据摘要
  - 后续再增强 PDF
- 第一版不要阻塞在 PDF 能力上。

### 视觉与交互

- 收据页面应更像正式凭证：
  - 标题、编号、房源/房间、租客、明细、合计、备注、作废章
  - 金额和日期排版清晰
  - 作废态明显但不破坏快照可读性

## 验证建议

- `npm test -- --runTestsByPath tests/cloud/receipt-create.spec.ts tests/cloud/receipt-void.spec.ts tests/cloud/unit-detail-flow.spec.ts --runInBand`
- 新增收据列表/筛选相关测试
- `npm test -- --runInBand`
- `npm run typecheck`

## 云函数提示

如果本阶段新增收据列表或保存能力，预计需要上传：

- `receipt-create`
- `receipt-get`
- `receipt-void`
- 可能新增：`receipt-list`

