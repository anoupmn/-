# 收租吧数据集合职责矩阵（v1 基线）

日期：2026-04-19  
目的：统一“每个操作该写哪个集合、哪些集合只能读”，避免读写口径不一致导致状态错乱。

## 1. 集合职责

| 集合 | 主职责 | 是否业务真相 |
|---|---|---|
| `assets` | 房源主数据 | 是 |
| `rooms` | 房间主数据 | 是 |
| `tenants` | 租客主数据 | 是 |
| `leases` | 租约主数据（租期、费用规则） | 是 |
| `bills` | 账单事实状态（应收、实收、状态） | 是 |
| `repair_records` | 维修事实记录 | 是 |
| `abnormal_flags` | 人工异常标记 | 是 |
| `notification_preferences` | 提醒偏好设置 | 是 |
| `alerts` | 提醒结果（可重建） | 否（派生） |

## 2. 操作到集合映射

| 操作 | 读集合 | 写集合 | 写入口（云函数） |
|---|---|---|---|
| 新增/编辑房源 | `assets` | `assets` | `assets-save` |
| 新增/编辑房间 | `rooms`/`assets` | `rooms` | `rooms-save` |
| 新增租约 | `rooms`/`tenants`/`leases` | `leases` + `bills` | `leases-save` |
| 编辑租约费用/租期 | `leases`/`bills` | `leases` + `bills` | `leases-save` |
| 结束租约 | `leases` | `leases` | `leases-end` |
| 登记缴费 | `bills` | `bills` | `bills-receive` |
| 补录费用 | `leases`/`bills` | `bills` | `bills-save` |
| 删除补录费用 | `bills` | `bills` | `bills-save` |
| 记录维修 | `rooms`/`leases`/`repair_records` | `repair_records` | `repair-record-save` |
| 人工异常开关 | `abnormal_flags` | `abnormal_flags` | `alert-manual-flag-save` |
| 提醒偏好保存 | `notification_preferences` | `notification_preferences` | `notification-preferences-save` |
| 首页/列表/详情展示 | 上述真相集合 + `alerts` | 不写 | `dashboard-home`/`rentable-units-list`/`rentable-unit-detail` |

## 3. 强约束（必须执行）

1. 读侧云函数不得写业务真相集合。  
说明：`rentable-unit-detail`、`rentable-units-list`、`dashboard-home` 只能读，不能补写/重建账单。

2. 每个真相集合只允许单一写入口。  
说明：例如 `bills` 只允许 `leases-save`（重算）+ `bills-receive`（收款）+ `bills-save`（补录/删除）写入。

3. 全量读取必须分页。  
说明：所有 `listAll()` 禁止只调用一次 `get()`；统一改为分页拉全量，避免“第一页偏差”。

4. 通过业务 `id` 读写，不依赖文档 `_id`。  
说明：`findById/updateRecord` 统一使用 `where({ id })` 路径。

## 4. 常见反模式（禁止）

1. 在详情查询时“发现账单缺失就自动重建”。  
后果：可能覆盖已登记收款状态。

2. 在写操作前先全表拉取再内存筛选。  
后果：分页数据不全时误判“不存在/无权限”。

3. 把派生数据（`alerts`）当作真相反写业务集合。  
后果：口径漂移、难以追溯。

## 5. 实施优先级

1. P0：修正 `bills-receive` 为精准查询（`billId + landlordOpenId`）。  
2. P0：禁用/移除 `rentable-unit-detail` 读侧账单重建。  
3. P1：统一 `listAll` 分页实现并替换所有共享 runtime。  
4. P1：补充链路测试（新增房间 -> 登记缴费 -> 详情状态变化）。

## 6. 验收标准

1. 新增房间账单可连续登记缴费，详情状态稳定更新为“已收”。  
2. 不再出现“提示成功但页面无变化/回滚”的现象。  
3. 同一条账单在数据库中的 `receivedAt/receivedAmount` 与前端展示一致。  
