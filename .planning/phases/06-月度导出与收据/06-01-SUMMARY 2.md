# 06-01 Summary — 导出与收据领域合同、测试基座和数据边界

**状态：** 完成
**完成时间：** 2026-04-28

## 完成内容

- 新增 `report_exports` 集合常量与 mock store 支持。
- 新增导出合同：`report-export` schema、月度明细/账单明细/房东支出明细/退租支出明细行结构。
- 新增收据合同：`receipt` schema，包含收据编号、快照项目、合计、收款日期和生成时间。
- 新增导出与收据 repository 基座，锁定跨房东隔离、租客收入合计、房东支出分离和收据快照规则。
- 新增测试：`report-export-create.spec.ts`、`receipt-create.spec.ts`；后续 Phase 7 修正后删除管理由 `receipt-delete.spec.ts` 覆盖。

## 验证

- `npm test -- --runTestsByPath tests/cloud/report-export-create.spec.ts tests/cloud/receipt-create.spec.ts tests/cloud/receipt-delete.spec.ts --runInBand`
- 后续阶段回归已包含全量 `npm test -- --runInBand` 与 `npm run typecheck`

## 备注

- 收据快照规则已和 Phase 05 的租约安全删除 blocker 对齐；最终用户操作口径为显式删除收据，而非作废重开。
- 导出合同明确使用 Phase 05 账单字段，不靠费用 label 猜测性质。
