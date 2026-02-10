# Implementation Plan: AI Planner Data Enhancement

## Overview

实现 AI Planner 与 TripDetailPage 之间的数据增强流程，通过高德地图 API 补充 POI 详情信息。

## Tasks

- [ ] 1. 创建高德地图 API 服务
  - [ ] 1.1 创建 AmapService 基础结构
    - 创建 `src/services/amapService.ts`
    - 定义接口类型 (AmapPOI, AmapSearchResult, AmapRouteResult)
    - 实现 API Key 配置读取
    - _Requirements: 3.1, 3.2_

  - [ ] 1.2 实现 POI 搜索功能
    - 实现 `searchPOI()` 方法
    - 实现 `searchNearby()` 方法
    - 添加请求参数构建和响应解析
    - _Requirements: 4.1_

  - [ ] 1.3 实现 POI 详情获取
    - 实现 `getPOIDetail()` 方法
    - 解析详情字段 (address, tel, rating, opentime, photos)
    - _Requirements: 4.2, 6.2, 7.2_

  - [ ] 1.4 实现路线规划功能
    - 实现 `getRoute()` 方法
    - 支持步行、驾车、公交三种模式
    - 解析路线步骤和时长距离
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ] 1.5 实现缓存机制
    - 使用 LocalStorage 缓存 POI 结果
    - 实现缓存 key 生成 (`${name}_${lat}_${lng}`)
    - 实现缓存过期检查 (24小时 TTL)
    - _Requirements: 4.4_

  - [ ]* 1.6 编写 AmapService 单元测试
    - 测试各 API 方法
    - 测试缓存逻辑
    - 测试错误处理

- [ ] 2. 实现错误处理和降级逻辑
  - [ ] 2.1 创建错误处理模块
    - 定义 AmapErrorType 枚举
    - 实现错误分类函数
    - 实现重试策略
    - _Requirements: 3.3_

  - [ ] 2.2 实现降级数据生成
    - 创建 `getFallbackData()` 函数
    - 根据活动类型生成默认图片
    - 保留 AI 提供的原始数据
    - _Requirements: 4.3, 5.2, 9.3_

  - [ ]* 2.3 编写属性测试 - Graceful Degradation
    - **Property 2: Graceful Degradation**
    - **Validates: Requirements 3.3, 4.3, 9.3**

- [ ] 3. 修改 AIPlannerChatPage 支持活动点击
  - [ ] 3.1 添加活动点击处理
    - 添加 `onActivityClick` prop
    - 为活动项添加点击事件
    - 添加 hover 样式和 cursor pointer
    - _Requirements: 2.1, 2.3_

  - [ ] 3.2 实现活动数据传递
    - 构建活动详情对象
    - 包含 name, type, description, coordinates
    - 调用 onActivityClick 回调
    - _Requirements: 2.2_

  - [ ]* 3.3 编写属性测试 - Activity Data Passthrough
    - **Property 5: Activity Data Passthrough**
    - **Validates: Requirements 2.2**

- [ ] 4. 增强 TripDetailPage 集成高德数据
  - [ ] 4.1 添加高德数据获取逻辑
    - 在组件加载时调用 AmapService
    - 根据活动类型选择 API 方法
    - 合并 AI 数据和高德数据
    - _Requirements: 4.1, 6.1, 7.1, 8.1_

  - [ ] 4.2 更新详情展示 UI
    - 显示高德返回的地址、电话、评分
    - 显示营业时间和价格
    - 显示图片画廊
    - _Requirements: 4.2, 5.1, 6.2, 6.3, 7.2, 7.3_

  - [ ] 4.3 添加交通路线展示
    - 显示路线距离和时长
    - 显示分步导航指令
    - _Requirements: 8.2, 8.3_

  - [ ]* 4.4 编写属性测试 - Type-based API Routing
    - **Property 1: Type-based API Routing**
    - **Validates: Requirements 4.1, 6.1, 7.1, 8.1**

- [ ] 5. 修改数据保存流程
  - [ ] 5.1 更新 TripDataTransformer
    - 添加 `transformWithEnhancement()` 方法
    - 在保存前获取高德数据
    - 合并增强数据到活动对象
    - _Requirements: 9.1_

  - [ ] 5.2 更新活动字段映射
    - 映射 address, image_url, duration, price
    - 处理高德数据不可用的情况
    - _Requirements: 9.2, 9.3_

  - [ ]* 5.3 编写属性测试 - Save Data Completeness
    - **Property 6: Save Data Completeness**
    - **Validates: Requirements 9.1, 9.2**

- [ ] 6. 实现缓存属性测试
  - [ ]* 6.1 编写属性测试 - POI Cache Consistency
    - **Property 3: POI Cache Consistency**
    - **Validates: Requirements 4.4**

  - [ ]* 6.2 编写属性测试 - Image Fallback Chain
    - **Property 4: Image Fallback Chain**
    - **Validates: Requirements 5.1, 5.2**

- [ ] 7. Checkpoint - 集成测试
  - 确保所有测试通过
  - 测试完整的点击 → 详情 → 保存流程
  - 验证高德 API 实际调用
  - 如有问题请询问用户

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- 高德 API Key 已配置在 `.env.local` 文件中
- 缓存使用 LocalStorage，TTL 为 24 小时
- 所有 API 错误都应优雅降级到 AI 数据
