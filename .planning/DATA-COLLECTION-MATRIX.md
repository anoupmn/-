# 收租吧数据集合职责矩阵（Phase 05/06 目标口径）

日期：2026-04-27  
目的：统一“每个操作该写哪个集合、哪些集合只能读”，避免读写口径不一致导致状态错乱、账单丢失、导出失真或收据历史被覆盖。

## 1. 集合职责

| 集合 | 主职责 | 是否业务真相 |
|---|---|---|
| `landlord_users` | 房东用户身份与工作空间 | 是 |
| `assets` | 房源主数据 | 是 |
| `rooms` | 房间主数据 | 是 |
| `tenants` | 租客主数据 | 是 |
| `leases` | 租约主数据（租期、费用规则、租约状态） | 是 |
| `bills` | 租客应收/实收账单事实 | 是 |
| `repair_records` | 房间维修事实、问题类型、发生日期、问题分析依据 | 是 |
| `owner_expenses` | 房东经营支出：维修成本、保洁、打理、请人管理、其他支出 | 是 |
| `receipts` | 收据快照、编号、作废重开记录 | 是 |
| `report_exports` | 导出任务/文件元数据（如需要异步生成） | 是 |
| `abnormal_flags` | 人工异常标记与维修高频异常事实 | 是 |
| `notification_preferences` | 提醒偏好设置 | 是 |
| `alerts` | 提醒结果（可重建） | 否（派生） |

## 2. 操作到集合映射

| 操作 | 读集合 | 写集合 | 写入口（云函数/模块） |
|---|---|---|---|
| 新增/编辑房源 | `assets` | `assets` | `assets-save` |
| 安全删除测试房源 | `assets`/`rooms`/`leases`/`bills`/`repair_records`/`owner_expenses`/`abnormal_flags` | 上述集合 | `assets-delete` 或维护专用函数 |
| 新增/编辑房间 | `rooms`/`assets` | `rooms` | `rooms-save` |
| 新增/编辑租客 | `tenants` | `tenants` | `tenants-save` |
| 新增租约 | `rooms`/`tenants`/`leases` | `leases` + `bills` | `leases-save` |
| 编辑租约费用/租期 | `leases`/`bills` | `leases` + `bills` | `leases-save` |
| 安全删除租约 | `leases`/`bills`/`repair_records`/`owner_expenses`/`receipts` | `leases` + 未收款账单 | `leases-delete`（Phase 05 新增或合并） |
| 结束租约/退租 | `leases`/`bills` | `leases`，必要时处理未收系统账单 | `leases-end` |
| 登记缴费 | `bills` | `bills` | `bills-receive` |
| 水电抄表补录 | `leases`/`bills` | `bills` | `bills-save` |
| 补录其他租客应收 | `leases`/`bills` | `bills` | `bills-save` |
| 删除/作废补录账单 | `bills`/`receipts` | `bills` | `bills-save` |
| 记录维修事实 | `rooms`/`leases`/`repair_records` | `repair_records` | `repair-record-save` |
| 记录维修/保洁/打理支出 | `assets`/`rooms`/`repair_records`/`owner_expenses` | `owner_expenses` | `owner-expense-save`（Phase 05 新增） |
| 人工异常开关 | `abnormal_flags` | `abnormal_flags` | `alert-manual-flag-save` |
| 维修高频异常同步 | `repair_records`/`rooms`/`leases` | `abnormal_flags` | 写侧或聚合前专用同步逻辑 |
| 提醒偏好保存 | `notification_preferences` | `notification_preferences` | `notification-preferences-save` |
| 首页/提醒展示 | 真相集合 + `alerts` | `alerts`（派生，按当前房东重建） | `dashboard-home`/`alerts-list` |
| 列表/详情展示 | 真相集合 | 不写 | `rentable-units-list`/`rentable-unit-detail` |
| 月度导出 | `assets`/`rooms`/`tenants`/`leases`/`bills`/`owner_expenses`/`receipts` | `report_exports`（可选） | `report-export-create`（Phase 06 新增） |
| 生成收据 | `bills`/`leases`/`rooms`/`tenants`/`assets` | `receipts` | `receipt-create`（Phase 06 新增） |
| 作废收据 | `receipts` | `receipts` | `receipt-void`（Phase 06 新增或合并） |

## 3. 强约束（必须执行）

1. 读侧展示函数不得写业务真相集合。  
说明：`rentable-unit-detail`、`rentable-units-list` 只能读，不能补写/重建账单。

2. 派生集合 `alerts` 可以重建，但必须按当前房东范围清理和写入。  
说明：不得为了一个房东打开首页而清空所有房东的 `alerts`。

3. 每个真相集合只允许受控写入口。  
说明：例如 `bills` 只允许 `leases-save`（系统账单同步）、`bills-receive`（收款）、`bills-save`（补录/删除/作废）写入。

4. `syncBillsForLease` 不得按 `leaseId` 整批删除所有账单。  
说明：编辑租约时只替换未收款的系统生成账单；已收账单、手工账单、收据引用账单必须保留或走作废/更正流程。

5. 维修、保洁、打理、请人管理等房东支出不得写入 `bills`。  
说明：这类费用进入 `owner_expenses`，只用于留痕、复盘、问题房间分析和导出。

6. 收据必须保存快照，不得动态引用当前账单结果。  
说明：账单后续更正不能悄悄改变旧收据；录错时只能作废重开。

7. 全量读取必须分页。  
说明：所有 `listAll()` 禁止只调用一次 `get()`；统一分页拉全量，避免“第一页偏差”。

8. 业务读写优先通过业务 `id`，不得假设业务 `id` 与数据库 `_id` 一致。  
说明：`findById/updateRecord` 需要兼容 `where({ id })` 或显式处理 `_id` 差异。

## 4. 账单与支出口径

### 租客应收账单（`bills`）

- 房租
- 管理费（默认周期性，可改一次性）
- 水费（抄表计算）
- 电费（抄表计算）
- 押金
- 消防押金
- 锁卡押金
- 自定义周期性费用
- 自定义一次性费用
- 自定义押金类费用

### 房东经营支出（`owner_expenses`）

- 维修成本
- 保洁费用
- 打理费用
- 请人管理/处理问题费用
- 其他房东承担支出

### 维修问题分析

- 维修类记录参与房间问题频次和高频维修异常
- 保洁、打理、请人管理等经营支出不计入维修高频异常

## 5. 常见反模式（禁止）

1. 在详情查询时“发现账单缺失就自动重建”。  
后果：可能覆盖已登记收款状态。

2. 编辑租约时整批删除该租约下所有账单。  
后果：已收账单、手工补录、水电账单和收据引用都会丢失。

3. 把房东维修/打理支出塞入租客应收账单。  
后果：收据、催租、逾期和经营利润口径全部混乱。

4. 在写操作前先全表拉取再内存筛选。  
后果：分页数据不全时误判“不存在/无权限”。

5. 把派生数据（`alerts`）当作真相反写业务集合。  
后果：口径漂移、难以追溯。

6. 修改账单后自动改写历史收据内容。  
后果：纸质凭证和历史导出无法对账。

## 6. 实施优先级

1. P0：审计所有写入口，修正业务 `id` / `_id` 不一致风险。
2. P0：修正 `syncBillsForLease`，只替换未收款系统生成账单。
3. P0：新增账单分类合同，表达费用性质、责任方、押金类、一次性/周期性、水电抄表、legacy。
4. P1：新增或扩展房东支出集合与写入口，维修/保洁/打理不再进入 `bills`。
5. P1：补安全删除租约、退租和作废/更正策略。
6. P2：基于稳定账单合同实现月度导出和收据。

## 7. 验收标准

1. 新增房间账单可连续登记缴费，详情状态稳定更新为“已收”。
2. 编辑租约后，已收账单和手工账单不丢失。
3. 消防押金、锁卡押金进入账单/导出/收据，但不进入逾期提醒或下一笔租金核心提示。
4. 水电费由读数和单价计算，前端不手填最终金额。
5. 维修、保洁、打理支出不出现在租客应收账单和收据中。
6. 月度导出可以同时看到租客应收/实收与房东支出，但二者分区清晰。
7. 收据生成后内容快照固定，作废重开有记录。
