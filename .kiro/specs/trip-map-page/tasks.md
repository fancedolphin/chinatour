# Implementation Plan: TripMapPage 真实数据集成

## Overview

本实现计划将 TripMapPage 从 Mock 数据版本升级为数据库集成版本。任务按依赖顺序排列：先建库建表，再写 Seed 数据，再建服务层，最后改造前端组件。

## Tasks

- [ ] 1. 数据库 Migration
  - [ ] 1.1 创建枚举类型和三张新表
    - 创建 `map_location_type` 枚举：restaurant | attraction | hotel
    - 创建 `video_platform` 枚举：douyin | xiaohongshu
    - 创建 `trip_map_locations` 表（含外键 trip_id → trips.id）
    - 创建 `location_articles` 表（含外键 location_id → trip_map_locations.id）
    - 创建 `location_videos` 表（含外键 location_id → trip_map_locations.id）
    - _Requirements: 6.1, 6.2_

  - [ ] 1.2 配置 RLS 策略
    - trip_map_locations：SELECT/INSERT 需 trips.user_id = auth.uid()
    - location_articles：SELECT 通过 trip_map_locations JOIN trips 鉴权
    - location_videos：SELECT 通过 trip_map_locations JOIN trips 鉴权
    - _Requirements: 4（数据隔离）_

- [ ] 2. Seed 脚本
  - [ ] 2.1 新建 scripts/seed-trip-map-locations.mjs
    - 7 个地点使用固定 UUID（幂等 upsert）
    - 关联北京测试行程 `22222222-2222-4222-8222-222222222222`
    - 使用 SUPABASE_SERVICE_ROLE_KEY 绕过 RLS
    - _Requirements: 1.1（有数据才能验证）_

  - [ ] 2.2 写入 articles 和 videos
    - 先删后插保证幂等（DELETE + INSERT）
    - 9 篇文章、8 个视频对应各自 location_id
    - _Requirements: 4.3, 4.4_

  - [ ] 2.3 验证 Seed 数据
    - 运行脚本，确认 trip_map_locations: 7 条
    - 确认 location_articles: 9 条
    - 确认 location_videos: 8 条

- [ ] 3. Checkpoint — 数据层验证
  - 通过 Supabase Studio 或 SQL 查询确认数据正确写入
  - 确认 RLS 策略生效（anon key 访问返回空）

- [ ] 4. 新建 tripMapService
  - [ ] 4.1 创建 src/services/tripMapService.ts
    - 导入 supabase client 和 LocationPoint 类型
    - 实现 getLocationsByTripId(tripId) 方法
    - 并行查询 location_articles 和 location_videos
    - 组装返回嵌套 LocationPoint[]
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ] 4.2 添加错误处理
    - DB 查询失败时抛出描述性错误
    - 空结果时返回 [] 而非 null
    - _Requirements: 6.5_

- [ ] 5. 改造 TripMapPage 组件
  - [ ] 5.1 替换组件主体为新版本
    - 写入包含 AMap SDK / 城市聚合 / 详情面板 / 导出功能的新组件
    - _Requirements: 2, 3, 4, 5_

  - [ ] 5.2 删除 MOCK_LOCATIONS，改为 DB 加载
    - 添加 locations state（初始值 []）
    - 添加 locationsLoading / locationsError state
    - 添加 useEffect 调用 tripMapService.getLocationsByTripId(tripId)
    - CITY_CLUSTERS 改为从 locations state 动态计算
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ] 5.3 添加 Loading 和 Error 状态 UI
    - locationsLoading 时在地图容器上显示 spinner overlay
    - locationsError 时显示错误提示和重试按钮
    - _Requirements: 1.2, 1.5_

- [ ] 6. Checkpoint — 端到端验证
  - 打开北京测试行程 → 点击地图按钮 → 看到3个城市气泡（北京/天津/廊坊）
  - 放大 zoom ≥ 11 → 看到7个地点标记和虚线路线
  - 点击宫宴地点 → 看到2篇文章和2个视频（来自 DB）
  - 点击导出按钮 → 高德/Google Maps URL 正确包含全部7个地点

## Notes

- Seed 脚本中三河古镇无文章，有1个视频
- `distance` 字段不存数据库，前端动态计算（可暂时写 '0'）
- tripMapService 的 LocationPoint 类型从 TripMapPage 组件 import，避免类型重复定义
- 已有 AMap /amap-config Edge Function，不需要额外配置地图密钥
- 固定 UUID 格式：`loc00000-0000-4000-8000-00000000000X`（X = 1-7）
