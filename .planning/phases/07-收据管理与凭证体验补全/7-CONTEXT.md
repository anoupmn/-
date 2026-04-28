# 第 7 阶段：收据管理与凭证体验补全 - 上下文

## 背景

Phase 06/07 已经完成最终收据闭环：

- `receipt-create`：从已收租客账单生成收据快照
- `receipt-get`：读取历史收据快照
- `receipt-list`：按业务筛选收据记录
- `receipt-lease-options`：返回可开收据的租约和月份
- `receipt-pdf`：导出 PDF 打印版
- `receipt-delete`：删除误开的收据并解除账单收据引用
- `pages/receipt`：展示收据预览，支持 PDF 打印版、复制摘要、分享和删除
- `unit-detail`：月度账单区显示“开具本租约本月收据 / 查看本月收据”

但这仍偏“账单详情里的单张收据功能”，还不是个人房东日常会使用的完整收据管理体验。

## 阶段目标

补齐收据记录管理与正式凭证体验，让用户能：

1. 在业务维护中进入收据记录管理
2. 按月份、房源、房间和租客筛选收据
3. 查看收据与租约月份、账单、房间、租客、金额的关系
4. 对一个租约某个月的多笔已收账单合并开具一张收据
5. 删除误开的收据，并解除对应账单上的收据引用
6. 打印、保存或分享收据，形成接近真实纸质凭证的体验

## 已有基础

- `cloudfunctions/shared/schemas/receipt.ts`
- `cloudfunctions/shared/repositories/receipt-repository.ts`
- `cloudfunctions/receipt-create`
- `cloudfunctions/receipt-get`
- `cloudfunctions/receipt-delete`
- `cloudfunctions/receipt-list`
- `cloudfunctions/receipt-lease-options`
- `cloudfunctions/receipt-pdf`
- `miniprogram/services/receipt.ts`
- `miniprogram/pages/receipt`
- `miniprogram/pages/unit-detail`
- `tests/cloud/receipt-create.spec.ts`
- `tests/cloud/receipt-delete.spec.ts`
- `tests/cloud/receipt-list.spec.ts`
- `tests/cloud/receipt-pdf.spec.ts`
- `tests/cloud/unit-detail-flow.spec.ts`

## 关键设计决策

- 收据只针对租客已收款项，不包含房东支出。
- 收据内容必须保存快照，不能动态读取当前账单重算。
- 每个租约每个月只能开一张收据；重复开具时应打开/返回已有收据。
- 删除收据会解除账单 `receiptId` / `receiptNo`，让该租约月份可重新开具。
- 收据管理入口应放在业务维护，不放在首页。
- 房间详情仍保留“开具本租约本月收据 / 查看本月收据”的上下文入口。

## 需要规划的能力

### 收据记录管理

- 新增收据记录列表页
- 支持按月份、房源、房间、租客筛选
- 支持打开、删除
- 支持从记录回到房间详情

### 合并开具收据

- 支持按 `leaseId + month` 生成一个租约一个月多笔已收账单的收据
- 前端只提供租约和月份选择，不提供逐细项收据按钮
- 已有有效收据的租约月份不得重复出现在可开选项中

### 保存/分享

- 优先评估小程序可落地能力：
  - 保存为图片
  - 分享页面
  - 复制收据摘要
  - PDF 打印版

### 视觉与交互

- 收据页面应更像正式凭证：
  - 标题、编号、房源/房间、租客、明细、合计、备注、生成时间
  - 金额和日期排版清晰

## 验证建议

- `npm test -- --runTestsByPath tests/cloud/receipt-create.spec.ts tests/cloud/receipt-delete.spec.ts tests/cloud/receipt-list.spec.ts tests/cloud/receipt-pdf.spec.ts tests/cloud/unit-detail-flow.spec.ts --runInBand`
- 新增收据列表/筛选相关测试
- `npm test -- --runInBand`
- `npm run typecheck`

## 云函数提示

如果本阶段新增收据列表或保存能力，预计需要上传：

- `receipt-create`
- `receipt-get`
- `receipt-list`
- `receipt-lease-options`
- `receipt-delete`
- `receipt-pdf`
