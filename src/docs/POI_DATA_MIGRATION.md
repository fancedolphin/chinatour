# POI 数据落库与前端对接记录

## 近期变更
- 新增迁移 `004_poi_detail_tables.sql`：为活动添加 `restaurant_id / attraction_id / transport_route_id` 外键，并创建支撑表 `restaurant_dishes`、`transport_routes`，补充餐厅/景点的详情字段。
- 更新 `scripts/seed-mock-trips.mjs`：写入餐厅、招牌菜、景点、交通路线，并在种子行程的活动里填充上述外键。
- 前端 `TripDetailPage`：点击活动时按外键实时从 Supabase 拉取详情并渲染 `RestaurantDetailCard` / `AttractionDetailCard` / `TransportDetailCard`，带本地 fallback。

## 已执行
- ✅ 迁移已应用：`004_poi_detail_tables.sql`
- ✅ 种子脚本已更新并完成写入
  - 用户 ID：`17b943cd-8ce6-4df4-ac94-6b22718bd237`
  - 餐厅 2 条，招牌菜 5 条，景点 3 条，交通路线 1 条
  - 行程 2 条（伦敦·爱丁堡 / 北京办事处探店），含每日行程与活动外键

## 待执行
- 若切换用户请重新运行：`SUPABASE_SERVICE_ROLE_KEY=... SEED_USER_ID=<user_id> npm run seed:trips`（默认覆盖）

## 验证建议
1) 应用迁移后，确认表与外键存在：`restaurant_dishes`、`transport_routes`、`activities` 的新列。  
2) 种子成功后，TripDetailPage 点击餐厅/景点/交通活动应显示来自 Supabase 的详情卡片。  
3) 若使用自定义用户，设置 `SEED_USER_ID` 以便将行程写入指定用户名下。
