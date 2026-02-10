# Implementation Plan: AI Trip Save Flow

## Overview

本实现计划将AI行程规划页面的"保存方案"功能与数据库打通，实现完整的行程保存、查看和管理流程。任务按照依赖关系排序，确保增量开发和早期验证。

## Tasks

- [ ] 1. 创建数据转换工具
  - [ ] 1.1 创建 tripDataTransformer 工具文件
    - 创建 `src/utils/tripDataTransformer.ts`
    - 定义 TripPlan、DayPlan、PlanActivity 接口
    - 定义 TransformedTripData 接口
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ] 1.2 实现日期解析函数 parseDates
    - 解析 "2024年10月1日 - 10月7日" 格式
    - 返回 ISO 格式的 startDate 和 endDate
    - 处理跨年情况
    - _Requirements: 2.2_

  - [ ] 1.3 实现完整转换函数 transform
    - 转换 trip 基础信息
    - 转换 itineraries 数组
    - 转换 activities 数组
    - 设置 source 为 'ai'
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 1.4 编写属性测试：数据转换正确性
    - **Property 2: Data Transformation Correctness**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**

- [ ] 2. 扩展 tripService 服务
  - [ ] 2.1 添加 createTripWithItineraries 方法
    - 在 `src/services/tripService.ts` 中添加新方法
    - 接收 TransformedTripData 参数
    - 先创建 trip 记录
    - 再批量创建 itineraries
    - 最后批量创建 activities
    - 返回完整的 TripDetail
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6_

  - [ ] 2.2 添加错误处理和日志
    - 捕获各步骤的错误
    - 记录详细日志
    - 抛出描述性错误信息
    - _Requirements: 6.5_

  - [ ]* 2.3 编写属性测试：完整行程结构创建
    - **Property 1: Complete Trip Structure Creation**
    - **Validates: Requirements 1.1, 1.2, 1.3**

  - [ ]* 2.4 编写属性测试：外键完整性
    - **Property 6: Foreign Key Integrity**
    - **Validates: Requirements 6.3, 6.4**

- [ ] 3. Checkpoint - 服务层验证
  - 确保所有测试通过，ask the user if questions arise.

- [ ] 4. 更新 AIPlannerChatPage 组件
  - [ ] 4.1 添加认证集成
    - 导入 useAuth hook
    - 获取 currentUser
    - 检查登录状态
    - _Requirements: 1.4_

  - [ ] 4.2 添加保存状态管理
    - 添加 isSaving 状态
    - 添加 saveSuccess 状态
    - 添加 savedTripId 状态
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ] 4.3 实现 handleSavePlan 方法
    - 检查用户登录状态
    - 调用 tripDataTransformer.transform
    - 调用 tripService.createTripWithItineraries
    - 处理成功和失败情况
    - _Requirements: 1.1, 1.5, 1.6_

  - [ ] 4.4 更新保存按钮 UI
    - 显示 loading 状态
    - 禁用按钮防止重复提交
    - 成功后显示成功状态
    - 添加跳转到"我的行程"的选项
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ] 4.5 添加 Toast 通知
    - 保存成功通知
    - 保存失败通知
    - 未登录提示
    - _Requirements: 1.5, 1.6_

- [ ] 5. 更新 TripDetailPage 组件
  - [ ] 5.1 添加数据加载逻辑
    - 添加 loading、error 状态
    - 调用 tripService.getTripDetail
    - 处理加载失败情况
    - _Requirements: 4.1, 4.2_

  - [ ] 5.2 更新数据渲染逻辑
    - 使用数据库数据替代 mock 数据
    - 保持现有 UI 结构
    - 处理空数据情况
    - _Requirements: 4.3, 4.4_

  - [ ] 5.3 添加 Loading 和 Error 状态 UI
    - 显示加载骨架屏
    - 显示错误信息和重试按钮
    - _Requirements: 4.3_

  - [ ]* 5.4 编写属性测试：行程详情数据加载
    - **Property 5: Trip Detail Data Loading**
    - **Validates: Requirements 4.1, 4.2, 6.6**

- [ ] 6. 更新 MyTripsPage 组件
  - [ ] 6.1 优化创建行程入口
    - 更新"创建新行程"按钮行为
    - 添加导航到 AI 规划页面的逻辑
    - _Requirements: 5.1, 5.2_

  - [ ] 6.2 添加行程列表自动刷新
    - 从 AI 规划页面返回时刷新列表
    - 使用 useEffect 监听导航状态
    - _Requirements: 5.4_

- [ ] 7. Checkpoint - 前端集成验证
  - 确保所有测试通过，ask the user if questions arise.

- [ ] 8. 端到端集成测试
  - [ ]* 8.1 编写属性测试：往返数据一致性
    - **Property 4: Round-Trip Data Consistency**
    - **Validates: Requirements 2.7**

  - [ ]* 8.2 编写集成测试：完整保存流程
    - 测试从 AI 规划到保存到查看的完整流程
    - 验证数据正确性
    - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2_

- [ ] 9. Final Checkpoint - 完整功能验证
  - 确保所有测试通过，ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- 建议先完成核心功能（任务1-4），再进行优化和测试
