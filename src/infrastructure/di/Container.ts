/**
 * Infrastructure Layer - Dependency Injection Container
 * 依赖注入容器（管理所有依赖）
 */

// Domain
import { TripPlanningService } from '../../domain/services/TripPlanningService';

// Infrastructure - Repositories
import { TripRepository } from '../repositories/TripRepository';
import { EmergencyRepository } from '../repositories/EmergencyRepository';
import { UserRepository } from '../repositories/UserRepository';
import { FeedRepository } from '../repositories/FeedRepository';
import { TravelTipRepository } from '../repositories/TravelTipRepository';

// Infrastructure - Services
import { ShareService } from '../services/ShareService';

// Application - Use Cases
import { CreateTripUseCase } from '../../application/use-cases/CreateTripUseCase';
import { ShareTripUseCase } from '../../application/use-cases/ShareTripUseCase';
import { GetEmergencyInfoUseCase } from '../../application/use-cases/GetEmergencyInfoUseCase';
import { GetMyTripsUseCase } from '../../application/use-cases/GetMyTripsUseCase';
import { LoginUseCase } from '../../application/use-cases/LoginUseCase';
import { RegisterUseCase } from '../../application/use-cases/RegisterUseCase';
import { GetFeedUseCase } from '../../application/use-cases/GetFeedUseCase';
import { GetTravelTipsUseCase } from '../../application/use-cases/GetTravelTipsUseCase';
import { ChangePasswordUseCase } from '../../application/use-cases/ChangePasswordUseCase';

// Infrastructure - Initializers
import { AdminInitializer } from '../initializers/AdminInitializer';

/**
 * 依赖注入容器
 * 负责创建和管理所有依赖关系
 */
export class DIContainer {
  private static instance: DIContainer;
  
  // Domain Services (单例)
  private tripPlanningService: TripPlanningService;

  // Repositories (单例)
  private tripRepository: TripRepository;
  private emergencyRepository: EmergencyRepository;
  private userRepository: UserRepository;
  private feedRepository: FeedRepository;
  private travelTipRepository: TravelTipRepository;

  // Infrastructure Services (单例)
  private shareService: ShareService;

  // Initializers (单例)
  private adminInitializer: AdminInitializer;

  // Use Cases (每次创建新实例)
  // 注意：Use Cases 是短暂的，每次使用时创建

  private constructor() {
    // 初始化Domain Services
    this.tripPlanningService = new TripPlanningService();

    // 初始化Repositories
    this.tripRepository = new TripRepository();
    this.emergencyRepository = new EmergencyRepository();
    this.userRepository = new UserRepository();
    this.feedRepository = new FeedRepository();
    this.travelTipRepository = new TravelTipRepository();

    // 初始化Infrastructure Services
    this.shareService = new ShareService();

    // 初始化Initializers
    this.adminInitializer = new AdminInitializer(this.userRepository);
    
    // 初始化示例数据
    this.initializeSampleData();
    
    // 初始化默认账户
    this.initializeDefaultAccounts();
  }

  /**
   * 初始化示例数据
   */
  private async initializeSampleData(): Promise<void> {
    try {
      await this.feedRepository.initializeSampleData();
    } catch (error) {
      console.error('Failed to initialize sample data:', error);
    }
  }

  /**
   * 初始化默认账户
   */
  private async initializeDefaultAccounts(): Promise<void> {
    try {
      await this.adminInitializer.initializeAllDefaults();
    } catch (error) {
      console.error('Failed to initialize default accounts:', error);
    }
  }

  /**
   * 获取容器单例
   */
  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  /**
   * 重置容器（用于测试）
   */
  static reset(): void {
    DIContainer.instance = new DIContainer();
  }

  // ==================== Domain Services ====================

  getTripPlanningService(): TripPlanningService {
    return this.tripPlanningService;
  }

  // ==================== Repositories ====================

  getTripRepository(): TripRepository {
    return this.tripRepository;
  }

  getEmergencyRepository(): EmergencyRepository {
    return this.emergencyRepository;
  }

  getUserRepository(): UserRepository {
    return this.userRepository;
  }

  getFeedRepository(): FeedRepository {
    return this.feedRepository;
  }

  getTravelTipRepository(): TravelTipRepository {
    return this.travelTipRepository;
  }

  // ==================== Infrastructure Services ====================

  getShareService(): ShareService {
    return this.shareService;
  }

  // ==================== Initializers ====================

  getAdminInitializer(): AdminInitializer {
    return this.adminInitializer;
  }

  // ==================== Use Cases ====================

  /**
   * 创建CreateTripUseCase实例
   * 注入所需依赖
   */
  getCreateTripUseCase(): CreateTripUseCase {
    return new CreateTripUseCase(
      this.tripRepository,
      this.tripPlanningService
    );
  }

  /**
   * 创建ShareTripUseCase实例
   */
  getShareTripUseCase(): ShareTripUseCase {
    return new ShareTripUseCase(
      this.tripRepository,
      this.shareService
    );
  }

  /**
   * 创建GetEmergencyInfoUseCase实例
   */
  getGetEmergencyInfoUseCase(): GetEmergencyInfoUseCase {
    return new GetEmergencyInfoUseCase(
      this.emergencyRepository
    );
  }

  /**
   * 创建GetMyTripsUseCase实例
   */
  getGetMyTripsUseCase(): GetMyTripsUseCase {
    return new GetMyTripsUseCase(
      this.tripRepository,
      this.tripPlanningService
    );
  }

  /**
   * 创建LoginUseCase实例
   */
  getLoginUseCase(): LoginUseCase {
    return new LoginUseCase(this.userRepository, this.adminInitializer);
  }

  /**
   * 创建RegisterUseCase实例
   */
  getRegisterUseCase(): RegisterUseCase {
    return new RegisterUseCase(this.userRepository);
  }

  /**
   * 创建GetFeedUseCase实例
   */
  getGetFeedUseCase(): GetFeedUseCase {
    return new GetFeedUseCase(this.feedRepository);
  }

  /**
   * 创建GetTravelTipsUseCase实例
   */
  getTravelTipsUseCase(): GetTravelTipsUseCase {
    return new GetTravelTipsUseCase(this.travelTipRepository);
  }

  /**
   * 创建ChangePasswordUseCase实例
   */
  getChangePasswordUseCase(): ChangePasswordUseCase {
    return new ChangePasswordUseCase(this.userRepository);
  }
}

/**
 * 导出容器实例
 */
export const container = DIContainer.getInstance();
