# 06-02 Summary — 月度经营多 sheet Excel 导出云函数

**状态：** 完成
**完成时间：** 2026-04-28

## 完成内容

- 新增 `report-export-create` 云函数。
- 新增 `report-export-list` 和 `report-export-delete` 云函数，用于管理历史导出记录。
- 实现按月份、全部/房源/房间范围聚合导出数据。
- 输出 4 个 sheet：`月度明细`、`账单明细`、`房东支出明细`、`退租支出明细`。
- 月度明细一行一个房间，包含水电读数、房租、管理费、其他应收、维修费、其他支出、本月实收、本月未收。
- `房租水电合计` 只统计租客侧收入项，不混入维修、保洁、打理等房东支出。
- 云函数支持用 `xlsx` 生成文件；测试环境无 `xlsx` 模块时会退回 JSON buffer 以保持自动化验证稳定。
- 新增小程序服务 `createMonthlyReportExport`、`listReportExports`、`deleteReportExport`。

## 验证

- `npm test -- --runTestsByPath tests/cloud/report-export-create.spec.ts --runInBand`
- 全量回归：`npm test -- --runInBand`
- 类型检查：`npm run typecheck`

## 备注

- 当前导出云函数返回文件元数据、sheet 名称、汇总摘要和测试可断言的 workbook 数据。
- 真实云环境上传后会返回 `fileID`，小程序端使用 `downloadFile + openDocument` 打开。
- 导出记录可在页面内查看、打开和删除，避免历史记录长期堆积。
