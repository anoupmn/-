# 06-04 Summary — 小程序导出与收据入口、预览体验和阶段回归

**状态：** 完成
**完成时间：** 2026-04-28

## 完成内容

- 在 `业务维护` Tab 增加 `月度经营导出` 入口。
- 新增 `pages/report-export`，支持选择月份、全部/房源/房间范围并生成导出；单房源/单房间通过 picker 选择，不再填写内部 ID。
- `pages/report-export` 支持导出记录管理，可查看历史记录、打开文件和删除记录。
- 移除原 `测试数据重置` 功能入口，并删除 `data-reset` 云函数和测试。
- 新增 `pages/receipt`，支持收据预览、作废和重开。
- 单元详情月度账单中，已收账单支持 `生成收据` / `查看收据`。
- `app.json` 注册导出页和收据页。

## 验证

- `npm test -- --runTestsByPath tests/cloud/unit-detail-flow.spec.ts tests/cloud/report-export-create.spec.ts tests/cloud/receipt-create.spec.ts tests/cloud/receipt-void.spec.ts --runInBand`
- `npm test -- --runInBand`：30 个测试套件、87 个用例通过
- `npm run typecheck`：通过

**追加验证：**
- `npm test -- --runInBand`：30 个测试套件、88 个用例通过
- `npm run typecheck`：通过

## 云函数上传清单

需要上传/部署：
- `report-export-create`
- `report-export-list`
- `report-export-delete`
- `receipt-create`
- `receipt-get`
- `receipt-void`

已删除，不再上传：
- `data-reset`

涉及 shared 副本同步：
- `report-export-create/shared`
- `report-export-list/shared`
- `report-export-delete/shared`
- `receipt-create/shared`
- `receipt-get/shared`
- `receipt-void/shared`
- `rentable-unit-detail/shared`
