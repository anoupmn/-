# 06-04 Summary — 小程序导出与收据入口、预览体验和阶段回归

**状态：** 完成
**完成时间：** 2026-04-28

## 完成内容

- 在 `业务维护` Tab 增加 `月度经营导出` 入口。
- 新增 `pages/report-export`，支持选择月份、全部/房源/房间范围并生成导出；单房源/单房间通过 picker 选择，不再填写内部 ID。
- `pages/report-export` 支持导出记录管理，可查看历史记录、打开文件和删除记录。
- 移除原 `测试数据重置` 功能入口，并删除 `data-reset` 云函数和测试。
- 新增 `pages/receipt`，支持收据预览、PDF 打印版导出、复制摘要、分享和删除收据。
- 单元详情月度账单中，按租约月份提供 `开具本租约本月收据` / `查看本月收据`。
- `app.json` 注册导出页和收据页。

## 验证

- `npm test -- --runTestsByPath tests/cloud/unit-detail-flow.spec.ts tests/cloud/report-export-create.spec.ts tests/cloud/receipt-create.spec.ts tests/cloud/receipt-delete.spec.ts --runInBand`
- `npm test -- --runInBand`：30 个测试套件、87 个用例通过
- `npm run typecheck`：通过

**追加验证：**
- `npm test -- --runInBand`：30 个测试套件、88 个用例通过
- `npm run typecheck`：通过

**导出文件覆盖修复：**
- 修复同月不同范围导出共用固定文件名导致云存储文件互相覆盖的问题。
- 导出文件名现包含导出范围、生成时间和唯一短 ID，避免“全部房源”记录打开到单房间文件。
- 补充回归测试，断言全部房源导出包含跨房源的全部房间，并断言同月不同范围导出文件名不重复。
- `npm test -- --runInBand`：30 个测试套件、89 个用例通过
- `npm run typecheck`：通过

## 云函数上传清单

需要上传/部署：
- `report-export-create`
- `report-export-list`
- `report-export-delete`
- `receipt-create`
- `receipt-get`
- `receipt-delete`
- `receipt-list`
- `receipt-lease-options`
- `receipt-pdf`

已删除，不再上传：
- `data-reset`

涉及 shared 副本同步：
- `report-export-create/shared`
- `report-export-list/shared`
- `report-export-delete/shared`
- `receipt-create/shared`
- `receipt-get/shared`
- `receipt-delete/shared`
- `receipt-list/shared`
- `receipt-lease-options/shared`
- `receipt-pdf/shared`
- `rentable-unit-detail/shared`
