# Requirements Document

## Introduction

优化 AI Planner 与 TripDetailPage 之间的数据流程。AI Planner 页面保持概览展示不变，但活动项需要支持点击交互，点击后跳转到 TripDetailPage 展示详细信息。对于 AI 无法提供的详细信息（如精确地址、营业时间、图片等），通过高德地图 API 进行补充获取。

## Glossary

- **AI_Planner**: AI 行程规划助手页面组件，提供行程概览和对话交互
- **TripDetailPage**: 行程详情展示页面，展示完整的活动详细信息
- **Activity**: 行程中的单个活动项，包括景点、餐饮、交通等
- **Amap_API**: 高德地图开放平台 API，用于获取 POI 详情、地址、图片等信息
- **POI**: Point of Interest，兴趣点，指地图上的具体地点

## Requirements

### Requirement 1: AI Planner 概览页面保持不变

**User Story:** As a user, I want the AI Planner page to show a trip overview, so that I can quickly see my entire itinerary at a glance.

#### Acceptance Criteria

1. THE AI_Planner SHALL maintain its current overview display format
2. THE AI_Planner SHALL continue to show day-by-day activity summaries
3. THE AI_Planner SHALL display basic activity information (time, name, description, type)

### Requirement 2: 活动项可点击交互

**User Story:** As a user, I want to click on any activity in the AI Planner, so that I can see detailed information about that activity.

#### Acceptance Criteria

1. WHEN a user clicks on an activity item in AI_Planner, THE System SHALL navigate to TripDetailPage showing that activity's details
2. WHEN navigating to detail view, THE System SHALL pass the activity's basic information and coordinates to TripDetailPage
3. THE AI_Planner SHALL provide visual feedback (hover state, cursor pointer) to indicate activities are clickable

### Requirement 3: 高德 API 集成配置

**User Story:** As a developer, I want to configure the Amap API, so that the system can fetch additional location details.

#### Acceptance Criteria

1. THE System SHALL store the Amap API key in environment variables (VITE_AMAP_API_KEY)
2. THE System SHALL create an Amap service module for API interactions
3. THE System SHALL handle API errors gracefully with fallback to AI-provided data

### Requirement 4: POI 详情获取

**User Story:** As a user, I want to see accurate location details, so that I can plan my visit effectively.

#### Acceptance Criteria

1. WHEN TripDetailPage loads an activity, THE System SHALL query Amap API for POI details using the activity name and coordinates
2. WHEN Amap returns POI data, THE System SHALL display: address, opening hours, phone number, and rating
3. IF Amap API fails or returns no results, THEN THE System SHALL display AI-provided information as fallback
4. THE System SHALL cache POI results to avoid redundant API calls

### Requirement 5: 地点图片获取

**User Story:** As a user, I want to see photos of attractions and restaurants, so that I can better visualize my trip.

#### Acceptance Criteria

1. WHEN displaying activity details, THE System SHALL fetch photos from Amap API if available
2. IF Amap photos are unavailable, THEN THE System SHALL use category-appropriate default images
3. THE System SHALL display multiple photos in a gallery format when available

### Requirement 6: 餐饮详情增强

**User Story:** As a user, I want to see restaurant details like cuisine type and price range, so that I can make dining decisions.

#### Acceptance Criteria

1. WHEN displaying a meal activity, THE System SHALL fetch restaurant details from Amap API
2. THE System SHALL display: cuisine type, price range, user ratings, and recommended dishes if available
3. THE System SHALL show restaurant opening hours and contact information

### Requirement 7: 景点详情增强

**User Story:** As a user, I want to see attraction details like ticket prices and visit tips, so that I can prepare for my visit.

#### Acceptance Criteria

1. WHEN displaying an attraction activity, THE System SHALL fetch POI details from Amap API
2. THE System SHALL display: ticket price, opening hours, recommended visit duration, and user reviews summary
3. THE System SHALL show nearby facilities (parking, restrooms, etc.) if available from Amap

### Requirement 8: 交通路线详情

**User Story:** As a user, I want to see detailed transport information, so that I can navigate between locations easily.

#### Acceptance Criteria

1. WHEN displaying a transport activity, THE System SHALL use Amap route planning API to get detailed directions
2. THE System SHALL display: estimated duration, distance, and cost
3. THE System SHALL show step-by-step navigation instructions when available

### Requirement 9: 数据保存时的详情补充

**User Story:** As a user, I want saved trips to include complete details, so that I can view them offline later.

#### Acceptance Criteria

1. WHEN saving a trip, THE System SHALL fetch and store Amap-enhanced details for each activity
2. THE System SHALL store: address, image_url, duration, price, and other Amap-provided fields
3. IF Amap data is unavailable during save, THEN THE System SHALL save with AI-provided data only
