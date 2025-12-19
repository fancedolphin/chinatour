# Requirements Document

## Introduction

本功能旨在打通AI行程规划页面（AIPlannerChatPage）与我的行程页面（MyTripsPage）之间的数据流，使用户能够将AI生成的行程方案保存到数据库，并在"我的行程"页面查看和管理。这是一个端到端的行程保存流程优化，涉及服务层扩展、UI交互改进和数据持久化。

## Glossary

- **Trip_Service**: 行程服务层，负责行程的CRUD操作
- **Itinerary_Service**: 行程详情服务层，负责每日行程和活动的CRUD操作
- **AI_Planner**: AI行程规划助手页面组件
- **Trip_Plan**: AI生成的行程方案数据结构
- **Day_Plan**: 单日行程计划，包含活动和餐饮推荐
- **Activity**: 行程中的单个活动项（景点、交通、休息等）
- **Auth_Context**: 认证上下文，提供当前登录用户信息

## Requirements

### Requirement 1: AI行程保存功能

**User Story:** As a user, I want to save AI-generated trip plans to my trips, so that I can access and manage them later.

#### Acceptance Criteria

1. WHEN a user clicks the "保存方案" button in AI_Planner, THE System SHALL create a new trip record in the database with the trip details
2. WHEN saving a trip, THE Trip_Service SHALL also create associated trip_itineraries records for each day
3. WHEN saving a trip, THE Itinerary_Service SHALL create activities records for each activity in the day plan
4. IF the user is not logged in, THEN THE System SHALL prompt the user to log in before saving
5. WHEN a trip is successfully saved, THE System SHALL display a success notification with an option to view the trip
6. IF saving fails, THEN THE System SHALL display an error message and allow retry

### Requirement 2: 行程数据转换

**User Story:** As a developer, I want a reliable data transformation layer, so that AI-generated plans can be correctly stored in the database schema.

#### Acceptance Criteria

1. THE Data_Transformer SHALL convert Trip_Plan destination to trips.destination field
2. THE Data_Transformer SHALL parse Trip_Plan dates string into trips.start_date and trips.end_date fields
3. THE Data_Transformer SHALL convert Trip_Plan budget to trips.budget field
4. THE Data_Transformer SHALL set trips.source to 'ai' for AI-generated trips
5. THE Data_Transformer SHALL convert each Day_Plan to a trip_itineraries record with correct day_number and theme
6. THE Data_Transformer SHALL convert each Activity to an activities record with correct type, time, name, and description
7. FOR ALL valid Trip_Plan objects, transforming then saving then retrieving SHALL produce equivalent trip data (round-trip property)

### Requirement 3: 保存状态管理

**User Story:** As a user, I want clear feedback during the save process, so that I know the status of my action.

#### Acceptance Criteria

1. WHILE saving is in progress, THE System SHALL display a loading indicator on the save button
2. WHILE saving is in progress, THE System SHALL disable the save button to prevent duplicate submissions
3. WHEN saving completes successfully, THE System SHALL update the button state to indicate success
4. WHEN saving completes successfully, THE System SHALL provide navigation option to "我的行程" page

### Requirement 4: 行程详情页面数据集成

**User Story:** As a user, I want to view saved AI trips with full details, so that I can see all the planned activities.

#### Acceptance Criteria

1. WHEN viewing a saved AI trip in TripDetailPage, THE System SHALL load trip_itineraries from the database
2. WHEN viewing a saved AI trip, THE System SHALL display activities for each day from the database
3. WHEN no itineraries exist for a trip, THE System SHALL display an empty state message
4. THE TripDetailPage SHALL support both mock data (for demo) and real database data

### Requirement 5: 创建行程入口优化

**User Story:** As a user, I want multiple ways to create trips, so that I can choose the most convenient method.

#### Acceptance Criteria

1. WHEN clicking "创建新行程" in MyTripsPage, THE System SHALL navigate to the trip creation flow
2. THE System SHALL support creating trips via AI planner
3. THE System SHALL support creating trips manually (future enhancement)
4. WHEN a new trip is created, THE System SHALL refresh the trips list automatically

### Requirement 6: 行程服务层扩展

**User Story:** As a developer, I want extended trip service capabilities, so that I can save complete trip data in a single transaction.

#### Acceptance Criteria

1. THE Trip_Service SHALL provide a createTripWithItineraries method for atomic trip creation
2. WHEN createTripWithItineraries is called, THE System SHALL create the trip record first
3. WHEN createTripWithItineraries is called, THE System SHALL then create all itinerary records with the trip_id
4. WHEN createTripWithItineraries is called, THE System SHALL then create all activity records with the itinerary_ids
5. IF any step fails, THEN THE System SHALL log the error and throw with a descriptive message
6. THE createTripWithItineraries method SHALL return the complete trip with nested itineraries and activities

