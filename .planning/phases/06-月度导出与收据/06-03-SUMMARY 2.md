# 06-03 Summary — 收据快照、预览数据与账单引用

**状态：** 完成
**完成时间：** 2026-04-28

## 完成内容

- 新增 `receipt-create` 云函数：仅允许已收租客账单生成收据。
- 新增 `receipt-get` 云函数：读取历史收据快照用于预览。
- 收据固定标注 `收款收据（非发票）`，保存房源/房间/租客、收款项目、合计金额、收款日期和生成时间。
- 创建收据后反写账单 `receiptId` / `receiptNo`，用于重复生成保护和租约删除保护。
- Phase 7 修正后，误开的收据通过 `receipt-delete` 删除；删除会解除对应账单 `receiptId` / `receiptNo`，该租约月份可重新开具。
- 新增小程序服务 `createReceipt`、`getReceipt`；最终删除管理由 `deleteReceipt` 承接。

## 验证

- `npm test -- --runTestsByPath tests/cloud/receipt-create.spec.ts tests/cloud/receipt-delete.spec.ts tests/cloud/leases-delete.spec.ts --runInBand`
- 全量回归：`npm test -- --runInBand`
- 类型检查：`npm run typecheck`

## 备注

- 房东支出不会进入收据。
- 已生成收据不会随账单后续修改动态变化。
- 收据不再包含收款人字段。
