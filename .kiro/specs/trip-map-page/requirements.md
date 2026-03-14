# Requirements Document

## Introduction

本功能旨在将 TripMapPage 从纯 Mock 数据版本升级为接入真实数据库的完整地图体验页面。用户能够通过高德地图查看行程中各地点的地理分布，点击地点查看来自小红书和抖音的相关文章与视频，并将行程路线导出到导航应用。这是一个涉及数据库扩展、服务层新增和前端组件改造的端到端功能。

## Glossary

- **TripMapPage**: 行程地图全屏页面组件，展示行程所有地点的地图视图
- **LocationPoint**: 行程地点数据结构，含坐标、地址、关联文章和视频
- **CityCluster**: 城市聚合标记，在低缩放级别展示某城市的地点数量
- **tripMapService**: 地图位置数据服务层，负责从数据库加载 LocationPoint 列表
- **trip_map_locations**: 存储行程地点的数据库表
- **location_articles**: 存储地点关联小红书文章的数据库表
- **location_videos**: 存储地点关联抖音/小红书视频的数据库表
- **AMap**: 高德地图 JS API，用于地图渲染和标记
- **ZOOM_THRESHOLD**: 缩放级别阈值（11），低于此值展示城市聚合，高于此值展示地点标记

## Requirements

### Requirement 1: 地图数据真实加载

**User Story:** As a user, I want to see real trip locations on the map, so that I can explore my actual itinerary geographically.

#### Acceptance Criteria

1. WHEN TripMapPage mounts with a tripId, THE System SHALL call tripMapService.getLocationsByTripId(tripId) to load location data
2. WHILE locations are loading, THE System SHALL display a loading indicator instead of an empty map
3. WHEN locations load successfully, THE System SHALL render all LocationPoints on the AMap instance
4. IF no locations exist for a tripId, THE System SHALL display an empty state message on the map
5. IF loading fails, THE System SHALL display an error state with a retry option
6. THE System SHALL NOT use hardcoded MOCK_LOCATIONS constant for production data

### Requirement 2: 城市聚合展示

**User Story:** As a user, I want to see city-level clusters when zoomed out, so that I can understand the overall geographic spread of my trip.

#### Acceptance Criteria

1. WHEN map zoom level is less than 11, THE System SHALL display CityCluster markers instead of individual location markers
2. EACH CityCluster marker SHALL display the city name and the count of locations in that city
3. WHEN a user clicks a CityCluster marker, THE System SHALL zoom the map to level 13 and center on that city
4. THE CityCluster coordinates SHALL be the average lat/lng of all locations in the city
5. WHEN locations data changes, THE city clusters SHALL be recalculated automatically

### Requirement 3: 行程路线连线

**User Story:** As a user, I want to see a route line connecting all my stops in order, so that I can visualize the flow of my trip.

#### Acceptance Criteria

1. WHEN map is displayed, THE System SHALL always render a dashed polyline connecting all LocationPoints sorted by order_index
2. WHEN zoom level is 11 or above, THE System SHALL display numbered step markers (起/1/2/.../终) at each location
3. THE first location SHALL be marked with 绿色「起」label, THE last with 紫色「终」label, and intermediate stops with red numbers
4. WHEN zoom level drops below 11, THE numbered step markers SHALL be hidden while the polyline remains visible
5. THE polyline SHALL use red dashed style (strokeColor: #ef4444, strokeStyle: 'dashed')

### Requirement 4: 地点详情面板

**User Story:** As a user, I want to view rich content about each location including videos and articles, so that I can learn more about the places I plan to visit.

#### Acceptance Criteria

1. WHEN a user clicks a location marker, THE System SHALL display a full-screen detail panel sliding up from the bottom
2. THE detail panel SHALL display the location's name, city, district, address
3. WHEN the location has associated videos, THE System SHALL display a video list section with thumbnail, author, date, platform badge, and title
4. WHEN the location has associated articles, THE System SHALL display an articles section with cover image, title, author avatar, author name, like count, and a link to open in Xiaohongshu
5. WHEN the detail panel is open, THE System SHALL display a floating map button to close the panel and return to the map view
6. THE detail panel SHALL support a loading state while data is being fetched

### Requirement 5: 导出到导航 App

**User Story:** As a user, I want to export my trip route to navigation apps, so that I can use turn-by-turn navigation during my trip.

#### Acceptance Criteria

1. WHEN the map is visible, THE System SHALL display a floating export button in the bottom-right corner
2. WHEN the export button is clicked, THE System SHALL show export options for 高德地图 and Google Maps
3. WHEN "导出到高德地图" is clicked, THE System SHALL open the AMap navigation URI with all locations as origin, waypoints, and destination sorted by order_index
4. WHEN "导出到 Google Maps" is clicked, THE System SHALL open the Google Maps directions URL with all locations as origin, waypoints, and destination
5. IF there are fewer than 2 locations, THE export buttons SHALL still work using available locations

### Requirement 6: 数据服务层

**User Story:** As a developer, I want a dedicated service for map location data, so that TripMapPage can load real data without direct database coupling.

#### Acceptance Criteria

1. THE tripMapService SHALL provide a getLocationsByTripId(tripId: string) method
2. WHEN getLocationsByTripId is called, THE System SHALL query trip_map_locations table filtered by trip_id, ordered by order_index
3. WHEN getLocationsByTripId is called, THE System SHALL also load all associated location_articles and location_videos in parallel
4. THE getLocationsByTripId method SHALL return a LocationPoint[] with nested articles[] and videos[] arrays
5. IF the database query fails, THE tripMapService SHALL throw an error with a descriptive message
6. THE tripMapService SHALL use the existing Supabase client from src/utils/supabase/client.ts
